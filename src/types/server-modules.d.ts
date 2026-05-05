declare module "resend" {
  export class Resend {
    constructor(apiKey: string);
    emails: {
      send(input: {
        from: string;
        to: string | string[];
        subject: string;
        html?: string;
        text?: string;
      }): Promise<unknown>;
    };
  }
}

declare module "stripe" {
  class Stripe {
    constructor(apiKey: string, config?: { apiVersion?: string });
    webhooks: {
      constructEvent(payload: string | Buffer, signature: string, secret: string): Stripe.Event;
    };
  }

  namespace Stripe {
    type Event = {
      type: string;
      data: {
        object: unknown;
      };
    };

    namespace Checkout {
      type Session = {
        id: string;
        payment_status?: string | null;
        customer_details?: {
          email?: string | null;
        } | null;
        metadata?: Record<string, string | undefined> | null;
      };
    }
  }

  export = Stripe;
}
