import React from 'react';
import { View, Text } from 'react-native';

class MapErrorBoundary extends React.Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.log('Map error caught:', error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#FFB800' }}>Map loading error. Try again later.</Text>
            </View>
        );
        }
        return this.props.children;
    }
}

export default MapErrorBoundary;