import { Redirect } from 'expo-router';
import { useAuth } from '@/components/hooks/useAuth';

export default function Index() {
    const { isSignedIn } = useAuth();

    return <Redirect href={isSignedIn ? "/home/HomeScreen" : "/home/HomeScreen"} />;
}