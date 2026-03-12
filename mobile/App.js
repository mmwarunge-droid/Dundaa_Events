import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  // Wrap the mobile navigator with app-wide auth state.
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
