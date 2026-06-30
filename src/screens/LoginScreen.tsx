import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Colors } from "../constants/colors";
import { useAuth } from "../hooks/useAuth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { loading, error, signIn } = useAuth();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>InsightBoard</Text>
        <Text style={styles.subtitle}>Speer Health</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel="Email input"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          accessibilityLabel="Password input"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={styles.button}
          onPress={() => signIn(email, password)}
          disabled={loading}
          accessibilityLabel="Sign in button"
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: "center", padding: 24 },
  logo: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.primary[500],
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 48,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  button: {
    backgroundColor: Colors.primary[500],
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: "600" },
  error: { color: Colors.system.error, marginBottom: 12, textAlign: "center" },
});