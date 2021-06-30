import React from 'react';
import {serverBaseUrl, isDivbloxWebApp} from '../app.json';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Button,
} from 'react-native';

class DivbloxReactNative {
  constructor() {
    this.dxAuthenticationToken = null;
    this.pushRegistrationId = null;
    this.navigationStack = null;
    if (isDivbloxWebApp) {
      this.initDivbloxWeb();
    } else {
      this.initDivbloxPureNative();
    }
  }
  initDivbloxWeb() {
    this.navigationStack = DivbloxWebStack;
  }
  initDivbloxPureNative() {
    this.navigationStack = DivbloxPureNativeStack;
  }
  getNavigationStack() {
    return this.navigationStack;
  }
}
//#region Screens
const Stack = createStackNavigator();

//#region Global Screens
const DivbloxGlobalInitScreen = ({navigation}) => {
  return (
    <Button
      title="Go to Welcome Screen"
      onPress={() => navigation.navigate('Welcome')}
    />
  );
};
const DivbloxGlobalWelcomeScreen = ({navigation, route}) => {
  return <Text>Welcome screen to be built</Text>;
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
//#endregion

//#region Web Screens
const DivbloxWebAppWrapperScreen = ({navigation, route}) => {
  return <Text>To be built. This will be the webview for the web app</Text>;
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
