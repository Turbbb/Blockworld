import { useEffect, useRef } from "react";
import {
  Switch,
  Route,
  useLocation,
  Router as WouterRouter,
} from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useClerk,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { deDE } from "@clerk/localizations";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/game/gameContext";
import { GamePage } from "@/pages/GamePage";
import NotFound from "@/pages/not-found";
import { queryClient } from "@/lib/queryClient";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(120 60% 38%)",
    colorForeground: "hsl(90 60% 90%)",
    colorMutedForeground: "hsl(90 20% 60%)",
    colorDanger: "hsl(0 70% 45%)",
    colorBackground: "hsl(120 20% 17%)",
    colorInput: "hsl(120 20% 28%)",
    colorInputForeground: "hsl(90 60% 90%)",
    colorNeutral: "hsl(120 20% 25%)",
    fontFamily: "'VT323', monospace",
    borderRadius: "0.25rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-card border-2 border-border rounded-md w-[420px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-accent text-2xl",
    headerSubtitle: "text-muted-foreground text-lg",
    socialButtonsBlockButtonText: "text-foreground text-lg",
    formFieldLabel: "text-foreground text-lg",
    footerActionLink: "text-primary text-lg",
    footerActionText: "text-muted-foreground text-lg",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-primary",
    alertText: "text-foreground",
    logoBox: "h-12",
    logoImage: "h-12 w-12",
    socialButtonsBlockButton: "border border-border bg-muted",
    formButtonPrimary: "bg-primary text-primary-foreground text-lg",
    formFieldInput: "bg-input text-foreground border border-border text-lg",
    footerAction: "text-muted-foreground",
    dividerLine: "bg-border",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={basePath || "/"}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={basePath || "/"}
      />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        ...deDE,
        signIn: {
          ...deDE.signIn,
          start: {
            ...deDE.signIn?.start,
            title: "Willkommen zurück",
            subtitle: "Melde dich an, um deinen Spielstand zu laden",
          },
        },
        signUp: {
          ...deDE.signUp,
          start: {
            ...deDE.signUp?.start,
            title: "Konto erstellen",
            subtitle: "Speichere deinen Fortschritt in der Cloud",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <GameProvider>
            <Switch>
              <Route path="/" component={GamePage} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route component={NotFound} />
            </Switch>
          </GameProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
