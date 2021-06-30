import React from 'react';

import DivbloxReactNative from "./divblox/divblox";
const Divblox = new DivbloxReactNative();
const NavigationStack = Divblox.getNavigationStack();

const App = () => {
    return (
        <NavigationStack/>
    );
};

export default App;