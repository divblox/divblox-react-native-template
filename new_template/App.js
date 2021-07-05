import React from 'react';
import RNBootSplash from "react-native-bootsplash";

import DivbloxReactNative from "./assets/js/divblox/divblox";
DivbloxReactNative.doInit();
const NavigationStack = DivbloxReactNative.getNavigationStack();

const App = () => {
    React.useEffect(() => {
        const init = async () => {
            // …do multiple sync or async tasks
        };
    
        init().finally(async () => {
            await RNBootSplash.hide({ fade: true });
        });
    },[]);
    return (
        <NavigationStack/>
    );
};

export default App;