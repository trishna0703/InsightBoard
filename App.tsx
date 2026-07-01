import React, { useEffect, useState } from "react";
import { ApolloProvider } from "@apollo/client";
import { Session } from "@supabase/supabase-js";
import { apolloClient } from "./src/services/apollo";
import { supabase } from "./src/services/supabase";
import LoginScreen from "./src/screens/LoginScreen";
import AppNavigator from "./src/navigation/AppNavigator";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "./src/constants/colors";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ErrorBoundary from "./src/components/common/ErrorBoundary";
import OfflineBanner from "./src/components/common/OfflineBanner";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ApolloProvider client={apolloClient}>
          {session ? <AppNavigator /> : <LoginScreen />}
          <OfflineBanner />
          <Toast />
        </ApolloProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
