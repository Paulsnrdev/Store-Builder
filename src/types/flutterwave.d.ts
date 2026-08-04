export {};

type FlutterwaveCheckoutOptions = {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  customer: { email: string; name: string; phonenumber: string };
  customizations?: { title?: string };
  callback?: (response: { status: string; transaction_id?: string | number; tx_ref?: string }) => void;
  onclose?: () => void;
};

declare global {
  interface Window {
    FlutterwaveCheckout?: (options: FlutterwaveCheckoutOptions) => void;
  }
}
