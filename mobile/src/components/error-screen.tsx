import { useAuthActions } from "@convex-dev/auth/react";
import { router } from "expo-router";
import { View } from "react-native";
import { CmpButton } from "@/components/cmp/cmp-button";
import { CmpText } from "@/components/cmp/cmp-text";
import { errorCode, errorMessage } from "@/lib/errors";
import { strings } from "@/lib/strings";

// Route error boundary body. Access errors (an email removed from
// ALLOWED_EMAILS, an expired session) offer Log out; others go back home.
export function ErrorScreen({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  const { signOut } = useAuthActions();
  const code = errorCode(error);
  const accessError = code === "notAllowed" || code === "notAuthenticated";
  return (
    <View className="bg-background flex-1 items-center justify-center gap-4 p-6">
      <CmpText className="text-center">{errorMessage(error)}</CmpText>
      {accessError ? (
        <CmpButton label={strings.auth.logOut} onPress={() => void signOut()} />
      ) : (
        <View className="flex-row gap-2">
          <CmpButton variant="outline" label={strings.retry} onPress={() => void retry()} />
          <CmpButton
            label={strings.note.back}
            onPress={() => {
              router.replace("/");
              void retry();
            }}
          />
        </View>
      )}
    </View>
  );
}
