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

const dimensions = Dimensions.get('window');

const DivbloxReactNative = {
  dxAuthenticationToken: null,
  pushRegistrationId: null,
  navigationStack: null,
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
  getNavigationStack() {
    return this.navigationStack;
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
    switch (receivedData.functionToExecute) {
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
        console.log('Function not implemented');
    }
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
  React.useEffect(
    () =>
      setTimeout(function () {
        //TODO: This must decide whether to go to welcome or to load the first screen
        navigation.navigate('Welcome');
      }, 1000),
    [navigation],
  );
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
  return (
    <>
      <SafeAreaView style={styles.fullscreenContainer}>
        <StatusBar barStyle={statusBarStyle} />
        <Text style={{color: fullscreenTextColor}}>Welcome</Text>
        <Button
          title="Go to app"
          onPress={() => navigation.navigate('WebWrapper')}
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
  React.useEffect(
    () =>
      navigation.addListener('beforeRemove', e => {
        // Prevent default behavior of leaving the screen
        e.preventDefault();
        console.log('Here we must send the back signal to the web app');
      }),
    [navigation],
  );
  return (
    <>
      <SafeAreaView style={styles.webContainerTop} />
      <SafeAreaView style={styles.webContainerBottom}>
        <StatusBar barStyle={statusBarStyle} />
        <WebView
          style={{width: dimensions.width}}
          source={{uri: serverBaseUrl}}
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
  return <Text>Welcome screen to be built</Text>;
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};
//#endregion
//#endregion

export default DivbloxReactNative;
