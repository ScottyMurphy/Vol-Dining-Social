import { Redirect } from "expo-router";

// When someone is signed out (for example right after tapping Log out),
// the app sends them to the (auth) group. This makes that land on the
// login screen instead of an "Unmatched Route" page.
export default function AuthIndex() {
  return <Redirect href="/login" />;
}
