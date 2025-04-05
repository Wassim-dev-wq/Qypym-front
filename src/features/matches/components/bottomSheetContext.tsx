import React, { createContext, useContext, useState } from 'react';

type BottomSheetContextType = {
    tabBarHeight: number;
    setTabBarHeight: (height: number) => void;
};

const BottomSheetContext = createContext<BottomSheetContextType>({
    tabBarHeight: 90,
    setTabBarHeight: () => {},
});

export function BottomSheetProvider({ children }: { children: React.ReactNode }) {
    const [tabBarHeight, setTabBarHeight] = useState(90);

    return (
        <BottomSheetContext.Provider value={{ tabBarHeight, setTabBarHeight }}>
            {children}
        </BottomSheetContext.Provider>
    );
}

export function useBottomSheetState() {
    const context = useContext(BottomSheetContext);
    if (context === undefined) {
        throw new Error('useBottomSheetState must be used within a BottomSheetProvider');
    }
    return context;
}