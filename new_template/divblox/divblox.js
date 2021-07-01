import React from 'react';
import {
  serverBaseUrl,
  isDivbloxWebApp,
  statusBarBackgroundColor,
  statusBarStyle,
  bottomBarBackgroundColor,
  fullscreenBackgroundColor,
  fullscreenTextColor,
} from '../app.json';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {
  Fragment,
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
} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import SafeAreaView from 'react-native-safe-area-view';
import {WebView} from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

const dimensions = Dimensions.get('window');

const DivbloxReactNative = {
  dxAuthenticationToken: null,
  pushRegistrationId: null,
  navigationStack: null,
  serverFinalUrl: serverBaseUrl + '/?view=native_landing&init_native=1',
  isConnected: false,
  currentNavigationObject: null,
  currentActiveScreen: null,
  doInit() {
    if (isDivbloxWebApp) {
      this.initDivbloxWeb();
    } else {
      this.initDivbloxPureNative();
    }
    this.registerEventHandlers();
  },
  initDivbloxWeb() {
    this.navigationStack = DivbloxWebStack;
  },
  initDivbloxPureNative() {
    this.navigationStack = DivbloxPureNativeStack;
  },
  registerEventHandlers() {
    NetInfo.addEventListener(state => {
      if (this.currentNavigationObject !== null) {
        if (!state.isConnected && this.isConnected) {
          this.currentNavigationObject.navigate('Offline');
        } else if (state.isConnected && !this.isConnected) {
          this.currentNavigationObject.navigate(this.currentActiveScreen);
        }
      }

      this.isConnected = state.isConnected;
    });
  },
  setNavigation(navigation, screen) {
    this.currentNavigationObject = navigation;
    this.currentActiveScreen = screen;
    console.log('Navigation set: ' + this.currentActiveScreen);
  },
  getNavigationStack() {
    return this.navigationStack;
  },
  getWebWrapperUrl() {
    return this.serverFinalUrl;
  },
  loadAppEntryPointScreen() {
    if (isDivbloxWebApp) {
      this.currentNavigationObject.navigate('WebWrapper');
    } else {
      this.currentNavigationObject.navigate('Placeholder');
    }
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
  async registerDevice() {
    try {
      this.dxAuthenticationToken = await AsyncStorage.getItem(
        'dxAuthenticationToken',
      );
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
          if (this.serverFinalUrl.indexOf('auth_token=') < 1) {
            this.serverFinalUrl += '&auth_token=' + this.dxAuthenticationToken;
            console.log('Final url set: ' + this.serverFinalUrl);
            this.loadAppEntryPointScreen();
          }
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
    await this.registerDevice();
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
});
//#endregion

//#region Screens
const Stack = createStackNavigator();

//#region Global Screens
const DivbloxGlobalInitScreen = ({navigation}) => {
  React.useEffect(() => {
    DivbloxReactNative.setNavigation(navigation, 'Init');
    (async () => {
      const isFirstLaunch = await AsyncStorage.getItem('isFirstLaunch');
      await DivbloxReactNative.registerDevice();
      if (isFirstLaunch === null) {
        navigation.navigate('Welcome');
      } else {
        DivbloxReactNative.loadAppEntryPointScreen();
      }
    })();
  }, [navigation]);
  return (
    <>
      <SafeAreaView style={styles.fullscreenContainer}>
        <StatusBar barStyle={statusBarStyle} />
        <LoadingIndicator />
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
        <Text style={{color: fullscreenTextColor}}>Welcome</Text>
        <Button
          title="Go to app"
          onPress={() => DivbloxReactNative.loadAppEntryPointScreen()}
          color={fullscreenTextColor}
        />
      </SafeAreaView>
    </>
  );
};
const DivbloxGlobalOfflineScreen = ({navigation, route}) => {
  return <Text>Offline screen to be built</Text>;
};
const DivbloxGlobalErrorScreen = ({navigation, route}) => {
  React.useEffect(() => {
    DivbloxReactNative.setNavigation(navigation, 'Error');
  }, [navigation]);
  return (
    <Text>
      Error screen to be built. Error message: {route.params.errorMessage}
    </Text>
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
      await AsyncStorage.setItem('isFirstLaunch', '1');
    })();
  }, [navigation]);
  return (
    <>
      <SafeAreaView style={styles.webContainerTop} />
      <SafeAreaView style={styles.webContainerBottom}>
        <StatusBar barStyle={statusBarStyle} />
        <WebView
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
          <Stack.Screen
            name="WebWrapper"
            component={DivbloxWebAppWrapperScreen}
          />
          <Stack.Screen name="Offline" component={DivbloxGlobalOfflineScreen} />
          <Stack.Screen name="Error" component={DivbloxGlobalErrorScreen} />
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
