import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  defaultDataIdFromObject,
} from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";
import { onError, ErrorResponse } from "@apollo/client/link/error";
import { supabase } from "./supabase";

const httpLink = createHttpLink({
  uri: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/graphql/v1`,
});

const authLink = setContext(async (_, { headers }: { headers: Record<string, string> }) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    headers: {
      ...headers,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: session?.access_token
        ? `Bearer ${session.access_token}`
        : "",
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }: ErrorResponse) => {
  if (graphQLErrors)
    graphQLErrors.forEach((e) => console.warn("[GraphQL]", e.message));
  if (networkError) console.warn("[Network]", networkError);
});

const cache = new InMemoryCache({
  dataIdFromObject(responseObject) {
    if ("nodeId" in responseObject) return `${responseObject.nodeId}`;
    return defaultDataIdFromObject(responseObject);
  },
});

export const apolloClient = new ApolloClient({
  link: errorLink.concat(authLink).concat(httpLink),
  cache,
});