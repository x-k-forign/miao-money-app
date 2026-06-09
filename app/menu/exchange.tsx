import { Redirect } from "expo-router";

export default function ExchangeMenuRedirect() {
  return <Redirect href={"/exchange" as never} />;
}
