import React from 'react';

import DivbloxReactNative from "./divblox/divblox";
DivbloxReactNative.doInit();
const NavigationStack = DivbloxReactNative.getNavigationStack();

const App = () => {
    return (
        <NavigationStack/>
    );
};

export default App;