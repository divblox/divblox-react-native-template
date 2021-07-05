import React from 'react';
import {
  serverBaseUrl,
  isDivbloxWebApp,
  statusBarBackgroundColor,
  statusBarStyle,
  bottomBarBackgroundColor,
  fullscreenBackgroundColor,
  fullscreenTextColor,
} from '../../../app.json';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Button,
  ActivityIndicator,
  Linking,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import SafeAreaView from 'react-native-safe-area-view';
import {WebView} from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

const dimensions = Dimensions.get('window');
const imageHeight_3_6x1 = Math.round((dimensions.width * 1) / 3.6);
const imageWidth_3_6x1 = dimensions.width;
const imageHeight_1x1 = Math.round(dimensions.width);
const imageWidth_1x1 = dimensions.width;

const DivbloxReactNative = {
  dxAuthenticationToken: null,
  pushRegistrationId: null,
  navigationStack: null,
  serverInitialUrl: serverBaseUrl + '/?view=native_landing&init_native=1',
  serverFinalUrl: this.serverInitialUrl,
  isConnected: false,
  currentNavigationObject: null,
  currentActiveScreen: null,
  webViewReference: null,
  doInit() {
    if (isDivbloxWebApp) {
      this.initDivbloxWeb();
    } else {
      this.initDivbloxPureNative();
    }
  },
  initDivbloxWeb() {
    this.navigationStack = DivbloxWebStack;
  },
  initDivbloxPureNative() {
    this.navigationStack = DivbloxPureNativeStack;
  },
  registerEventHandlers() {
    NetInfo.addEventListener(state => {
      const isConnectedLocal =
        state.isInternetReachable !== false || state.isConnected === true;

      (async () => {
        await this.restoreAuthenticationToken();
        if (!isConnectedLocal && this.isConnected) {
          this.currentNavigationObject.navigate('Offline');
        } else {
          this.currentNavigationObject.navigate(this.currentActiveScreen);
          if (this.currentActiveScreen === 'WebWrapper') {
            this.webViewReference.reload();
          }
        }
        this.isConnected = isConnectedLocal;
      })();
    });
  },
  setNavigation(navigation, screen) {
    this.currentNavigationObject = navigation;
    this.currentActiveScreen = screen;
  },
  getNavigationStack() {
    return this.navigationStack;
  },
  getWebWrapperUrl() {
    return this.serverFinalUrl;
  },
  loadAppEntryPointScreen() {
    // Debug code to allow for testing specific screens at load
    /*this.currentNavigationObject.navigate('Error');
    return;*/

    (async () => {
      await this.restoreAuthenticationToken();
      let isNotFirstLaunch = null;
      try {
        isNotFirstLaunch = await AsyncStorage.getItem('isNotFirstLaunch');
      } catch (error) {
        console.log('Error checking for first launch: ' + error);
      }
      if (isNotFirstLaunch === null) {
        await DivbloxReactNative.registerDevice();
        this.currentNavigationObject.navigate('Welcome');
      } else {
        if (this.dxAuthenticationToken === null) {
          await DivbloxReactNative.registerDevice();
        }
        if (isDivbloxWebApp) {
          this.currentNavigationObject.navigate('WebWrapper');
        } else {
          this.currentNavigationObject.navigate('Placeholder');
        }
      }
      this.registerEventHandlers();
    })();
  },
  /**
   * Determines whether a string is a valid JSON string
   * @param {String} input_string The string to check
   * @return {boolean} true if valid JSON, false if not
   */
  isJsonString(input_string) {
    try {
      JSON.parse(input_string);
    } catch (e) {
      return false;
    }
    return true;
  },
  /**
   * Returns either a valid JSON object from the input or an empty object
   * @param mixedInput: Can be json string or object
   * @return {any}
   */
  getJsonObject(mixedInput) {
    if (this.isJsonString(mixedInput)) {
      return JSON.parse(mixedInput);
    }
    let returnObj = {};
    try {
      let encodedString = JSON.stringify(mixedInput);
      if (this.isJsonString(encodedString)) {
        returnObj = JSON.parse(encodedString);
      }
    } catch (e) {
      return returnObj;
    }
    return returnObj;
  },
  /**
   * Used to receive messages from the web app. These messages indicate certain functions to execute natively
   * @param event
   */
  receiveMessageFromWeb(event) {
    let receivedData = this.getJsonObject(event.nativeEvent.data);
    console.log('Received payload: ' + JSON.stringify(receivedData));
    switch (receivedData.function_to_execute) {
      case 'redirectToExternalPath':
        Linking.canOpenURL(receivedData.redirect_url).then(supported => {
          if (supported) {
            Alert.alert(
              'Open Web Page',
              'You are now leaving the app and going to the web.',
              [
                {
                  text: 'Go',
                  onPress: () => Linking.openURL(receivedData.redirect_url),
                },
                {
                  text: 'Cancel',
                  onPress: () => console.log('Cancel Pressed'),
                  style: 'cancel',
                },
              ],
              {cancelable: true},
            );
          } else {
            console.log(
              "Don't know how to open URI: " + receivedData.redirect_url,
            );
          }
        });
        break;
      default:
        console.log(
          'Function not implemented. Received payload: ' +
            JSON.stringify(receivedData),
        );
    }
  },
  async dxRequestInternal(url, postBodyObj) {
    try {
      let response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBodyObj),
      });
      let json = await response.json();
      if (typeof json.Result !== 'undefined') {
        if (json.Result === 'Success') {
          return json;
        } else {
          return {dxRequestInternalError: json};
        }
      } else {
        return {dxRequestInternalError: json};
      }
    } catch (error) {
      console.error(error);
      return {dxRequestInternalError: error};
    }
  },
  async restoreAuthenticationToken() {
    try {
      this.dxAuthenticationToken = await AsyncStorage.getItem(
        'dxAuthenticationToken',
      );
      this.setFinalServerUrl();
    } catch (error) {
      console.log('Error restoring authentication token: ' + error);
    }
  },
  setFinalServerUrl() {
    this.serverFinalUrl =
      this.serverInitialUrl + '&auth_token=' + this.dxAuthenticationToken;
  },
  async registerDevice() {
    try {
      await this.restoreAuthenticationToken();
      const registerResult = await this.dxRequestInternal(
        serverBaseUrl + '/api/client_authentication_token/registerDevice',
        {
          AuthenticationToken: this.dxAuthenticationToken,
          DeviceUuid: DeviceInfo.getUniqueId(),
          DevicePlatform: DeviceInfo.getDeviceId(),
          DeviceOs: DeviceInfo.getSystemName(),
        },
      );
      console.log('Register result: ' + JSON.stringify(registerResult));
      if (typeof registerResult.dxRequestInternalError === 'undefined') {
        if (registerResult.Result === 'Success') {
          this.dxAuthenticationToken =
            registerResult.DeviceLinkedAuthenticationToken;
          await AsyncStorage.setItem(
            'dxAuthenticationToken',
            registerResult.DeviceLinkedAuthenticationToken,
          );
          await this.restoreAuthenticationToken();
        }
      }
    } catch (error) {
      console.log(error);
    }
  },
  async registerPushNotifications() {
    console.log(
      'TODO: Put your code that asks for push notification permissions here. Once a successful Push' +
        ' registration ID is received, send it to the server with',
    );
    //this.createPushRegistration([The ID received from the push service]);
  },
  async createPushRegistration(registrationId) {
    let returnData = {error: 'Unknown'};
    if (typeof registrationId === 'undefined') {
      returnData.error = 'No registration id provided';
      return returnData;
    }
    this.pushRegistrationId = await AsyncStorage.getItem('PushRegistrationId');
    if (this.pushRegistrationId !== null) {
      // We only want to send the push registration once
      returnData.error = 'Already registered';
      return returnData;
    }

    const pushRegistrationResult = await this.dxRequestInternal(
      serverBaseUrl + '/api/global_functions/updatePushRegistration',
      {
        registration_id: registrationId,
        device_uuid: DeviceInfo.getUniqueId(),
        device_platform: DeviceInfo.getDeviceId(),
        device_os: DeviceInfo.getSystemName(),
        AuthenticationToken: this.dxAuthenticationToken,
      },
    );
    if (typeof pushRegistrationResult.dxRequestInternalError === 'undefined') {
      if (pushRegistrationResult.Result === 'Success') {
        await AsyncStorage.setItem('PushRegistrationId', registrationId);
      }
    }
  },
  async reInitDevice() {
    await AsyncStorage.removeItem('dxAuthenticationToken');
    this.loadAppEntryPointScreen();
  },
  handleError() {
    this.currentNavigationObject.navigate('Error');
  },
};

//#region Styles
const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: fullscreenBackgroundColor,
    color: fullscreenTextColor,
  },
  webContainerTop: {
    flex: 0,
    backgroundColor: statusBarBackgroundColor,
  },
  webContainerBottom: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: bottomBarBackgroundColor,
  },
  logo_image: {
    marginTop: 0,
    height: imageHeight_3_6x1,
    width: imageWidth_3_6x1,
  },
  icon_image: {
    marginTop: 0,
    height: 200,
    width: 200,
  },
  heading: {
    marginTop: 20,
  },
  text: {
    marginHorizontal: 20,
    marginVertical: 10,
    textAlign: 'center',
  },
});
//#endregion

//#region Screens
const Stack = createStackNavigator();

//#region Global Screens
const DivbloxGlobalInitScreen = ({navigation}) => {
  React.useEffect(() => {
    DivbloxReactNative.setNavigation(navigation, 'Init');
    DivbloxReactNative.loadAppEntryPointScreen();
  }, [navigation]);
  return (
    <>
      <SafeAreaView style={styles.fullscreenContainer}>
        <StatusBar barStyle={statusBarStyle} />
        <Image
          style={styles.logo_image}
          source={require('../../images/divblox_logo_black.jpg')}
        />
      </SafeAreaView>
    </>
  );
};
const DivbloxGlobalWelcomeScreen = ({navigation, route}) => {
  React.useEffect(() => {
    DivbloxReactNative.setNavigation(navigation, 'Welcome');
  }, [navigation]);
  return (
    <>
      <SafeAreaView style={styles.fullscreenContainer}>
        <StatusBar barStyle={statusBarStyle} />
        <Image
          style={styles.logo_image}
          source={require('../../images/divblox_logo_black.jpg')}
        />
        <Text style={styles.heading}>WELCOME</Text>
        <Text style={styles.text}>
          This is the default welcome screen for a Divblox native app. It will
          only show once.
        </Text>
        <Text style={styles.text}>
          This is useful for introducing your app to the user and to inform the
          user that certain requests for permissions might follow (i.e Push
          notifications)
        </Text>
        <Button
          style={styles.button}
          title="Go to app"
          onPress={() => navigation.navigate('WebWrapper')}
        />
      </SafeAreaView>
    </>
  );
};
const DivbloxGlobalOfflineScreen = ({navigation, route}) => {
  return (
    <>
      <SafeAreaView style={styles.fullscreenContainer}>
        <StatusBar barStyle={statusBarStyle} />
        <Image
          style={styles.icon_image}
          source={require('../../images/dx_offline.png')}
        />
        <Text style={styles.heading}>YOU'RE OFFLINE</Text>
        <Text style={styles.text}>
          Please check your internet connection to proceed
        </Text>
      </SafeAreaView>
    </>
  );
};
const DivbloxGlobalErrorScreen = ({navigation, route}) => {
  return (
    <>
      <SafeAreaView style={styles.fullscreenContainer}>
        <StatusBar barStyle={statusBarStyle} />
        <Image
          style={styles.icon_image}
          source={require('../../images/dx_offline.png')}
        />
        <Text style={styles.heading}>AN ERROR OCCURRED</Text>
        <Button
          title="Reload App"
          onPress={() => DivbloxReactNative.reInitDevice()}
          color={fullscreenTextColor}
        />
      </SafeAreaView>
    </>
  );
};
const LoadingIndicator = () => {
  return (
    <ActivityIndicator
      style={{position: 'absolute', left: 0, right: 0, bottom: 0, top: 0}}
      size="large"
    />
  );
};
//#endregion

//#region Web Screens
const DivbloxWebAppWrapperScreen = ({navigation, route}) => {
  React.useEffect(() => {
    DivbloxReactNative.setNavigation(navigation, 'WebWrapper');
    navigation.addListener('beforeRemove', e => {
      // Prevent default behavior of leaving the screen
      e.preventDefault();
      console.log('Here we must send the back signal to the web app');
    });
    (async () => {
      await AsyncStorage.setItem('isNotFirstLaunch', '1');
    })();
  }, [navigation]);
  return (
    <>
      <SafeAreaView style={styles.webContainerTop} />
      <SafeAreaView style={styles.webContainerBottom}>
        <StatusBar barStyle={statusBarStyle} />
        <WebView
          ref={ref => (DivbloxReactNative.webViewReference = ref)}
          startInLoadingState={true}
          style={{width: dimensions.width}}
          source={{uri: DivbloxReactNative.getWebWrapperUrl()}}
          renderLoading={() => {
            return LoadingIndicator();
          }}
          onMessage={event => DivbloxReactNative.receiveMessageFromWeb(event)}
          onError={syntheticEvent => {
            const {nativeEvent} = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
          }}
        />
      </SafeAreaView>
    </>
  );
};
const DivbloxPreWebWrapperScreen = ({navigation, route}) => {
  React.useEffect(() => {
    DivbloxReactNative.setNavigation(navigation, 'PreWebWrapper');
  }, [navigation]);
  return (
    <>
      <SafeAreaView style={styles.fullscreenContainer}>
        <StatusBar barStyle={statusBarStyle} />
      </SafeAreaView>
    </>
  );
};
//#endregion

//#region Pure Native Screens
const DivbloxPureNativeWelcomeScreen = ({navigation, route}) => {
  React.useEffect(() => {
    DivbloxReactNative.setNavigation(navigation, 'Welcome');
  }, [navigation]);
  return <Text>Welcome screen to be built</Text>;
};
const DivbloxPureNativePlaceholderScreen = ({navigation, route}) => {
  React.useEffect(() => {
    DivbloxReactNative.setNavigation(navigation, 'Placeholder');
  }, [navigation]);
  return <Text>Placeholder screen to be built</Text>;
};
//#endregion

//#region Stacks
const DivbloxWebStack = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator headerMode="none">
          <Stack.Screen
            name="Init"
            component={DivbloxGlobalInitScreen}
            options={{title: 'Init'}}
          />
          <Stack.Screen name="Welcome" component={DivbloxGlobalWelcomeScreen} />
          <Stack.Screen name="Offline" component={DivbloxGlobalOfflineScreen} />
          <Stack.Screen name="Error" component={DivbloxGlobalErrorScreen} />
          <Stack.Screen
            name="PreWebWrapper"
            component={DivbloxPreWebWrapperScreen}
          />
          <Stack.Screen
            name="WebWrapper"
            component={DivbloxWebAppWrapperScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};
const DivbloxPureNativeStack = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Init"
          component={DivbloxGlobalInitScreen}
          options={{title: 'Init'}}
        />
        <Stack.Screen name="Welcome" component={DivbloxGlobalWelcomeScreen} />
        <Stack.Screen
          name="Placeholder"
          component={DivbloxPureNativePlaceholderScreen}
        />
        <Stack.Screen name="Offline" component={DivbloxGlobalOfflineScreen} />
        <Stack.Screen name="Error" component={DivbloxGlobalErrorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
//#endregion
//#endregion

export default DivbloxReactNative;
