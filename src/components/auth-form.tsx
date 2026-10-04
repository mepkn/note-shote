import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CmpButton } from "@/components/cmp/cmp-button";
import { CmpInput } from "@/components/cmp/cmp-field";
import { CmpText } from "@/components/cmp/cmp-text";
import { authErrorMessage } from "@/lib/errors";
import { strings } from "@/lib/strings";

type Flow = "signIn" | "signUp";

const s = strings.auth;

export function AuthForm({ flow }: { flow: Flow }) {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const isSignUp = flow === "signUp";

  async function submit() {
    setError(undefined);
    if (isSignUp && password.length < 8) {
      setError(strings.errors.passwordTooShort);
      return;
    }
    setSubmitting(true);
    try {
      await signIn("password", { email: email.trim().toLowerCase(), password, flow });
    } catch (e) {
      setError(authErrorMessage(e, flow));
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="bg-background flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerClassName="mx-auto w-full max-w-md flex-grow justify-center gap-6 p-6"
          keyboardShouldPersistTaps="handled">
          <View className="gap-2">
            <CmpText className="text-brand text-lg font-semibold">{strings.appName}</CmpText>
            <CmpText variant="h3">{isSignUp ? s.signUpTitle : s.signInTitle}</CmpText>
            <CmpText variant="muted">{isSignUp ? s.signUpSubtitle : s.signInSubtitle}</CmpText>
          </View>
          <View className="gap-4">
            <CmpInput
              label={s.email}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <CmpInput
              label={s.password}
              hint={isSignUp ? s.passwordHint : undefined}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={isSignUp ? "new-password" : "current-password"}
              textContentType={isSignUp ? "newPassword" : "password"}
              onSubmitEditing={submit}
            />
            {error && <CmpText className="text-destructive text-sm">{error}</CmpText>}
            <CmpButton
              label={isSignUp ? s.signUp : s.logIn}
              loading={submitting}
              disabled={!email.trim() || !password}
              onPress={submit}
            />
          </View>
          <Link href={isSignUp ? "/sign-in" : "/sign-up"} replace asChild>
            <CmpButton variant="link" label={isSignUp ? s.haveAccount : s.noAccount} />
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
