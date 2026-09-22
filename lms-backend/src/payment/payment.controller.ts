// Save as: lms-backend/src/payment/payment.controller.ts
//
// Serves a tiny, self-contained HTML page that embeds Razorpay's
// hosted checkout.js. The mobile app opens this URL in an in-app
// browser (expo-web-browser's openAuthSessionAsync) and gets
// redirected back to the app with the payment result — no native
// Razorpay SDK, no ejecting from Expo Go, no dev client needed.
//
// It reuses the SAME Payment row your /enrollments/checkout endpoint
// already created — amount and currency come from that row, not from
// anything the client sends, so there's no way to tamper with the price.

import { Controller, Get, Param, Query, Res, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentStatus } from './entities/payment.entity';

@ApiExcludeController() // this renders an HTML page for a browser, not a JSON endpoint — keep it out of Swagger
@Controller('payment')
export class PaymentController {
  constructor(
    private paymentsService: PaymentsService,
    private config: ConfigService,
  ) {}

  @Get('checkout-page/:orderId')
  async checkoutPage(
    @Param('orderId') orderId: string,
    @Query('redirect_uri') redirectUri: string,
    @Res() res: Response,
  ) {
    if (!redirectUri) {
      throw new BadRequestException('Missing redirect_uri');
    }

    const payment = await this.paymentsService.findByProviderOrderId(orderId);
    if (!payment) {
      throw new NotFoundException('Order not found');
    }

    // Someone reopening a link for an order that's already settled —
    // send them straight back instead of letting them pay twice.
    if (payment.status === PaymentStatus.PAID) {
      res.redirect(`${redirectUri}?status=already_paid`);
      return;
    }

    const html = this.buildCheckoutHtml({
      keyId: this.config.getOrThrow<string>('RAZORPAY_KEY_ID'),
      amountInPaise: Math.round(Number(payment.amount) * 100),
      currency: payment.currency,
      orderId,
      redirectUri,
    });

    // helmet's default CSP (set globally in main.ts) blocks the inline
    // script below and the external checkout.razorpay.com script — this
    // is the one route in the app that needs to relax that.
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  private buildCheckoutHtml(opts: {
    keyId: string;
    amountInPaise: number;
    currency: string;
    orderId: string;
    redirectUri: string;
  }): string {
    // JSON.stringify gives us safely-escaped JS string/number literals.
    // This is what stops redirect_uri (attacker-controlled query param)
    // from breaking out of the string and injecting a script.
    const optionsJson = JSON.stringify({
      key: opts.keyId,
      amount: opts.amountInPaise,
      currency: opts.currency,
      order_id: opts.orderId,
      name: 'Hope eLearning',
      description: 'Course purchase',
      theme: { color: '#4f46e5' },
    });
    const redirectUriJson = JSON.stringify(opts.redirectUri);

    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Complete your payment</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background:#f5f5fa; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
  .box { text-align:center; color:#555; }
  .spinner { border:4px solid #eee; border-top:4px solid #4f46e5; border-radius:50%; width:36px; height:36px; animation:spin 0.8s linear infinite; margin:0 auto 14px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <p>Opening secure checkout&hellip;</p>
  </div>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    var redirectUri = ${redirectUriJson};
    var options = ${optionsJson};

    options.handler = function (response) {
      var params = new URLSearchParams({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature
      });
      window.location.href = redirectUri + '?' + params.toString();
    };

    options.modal = {
      ondismiss: function () {
        window.location.href = redirectUri + '?status=cancelled';
      }
    };

    var rzp = new Razorpay(options);

    rzp.on('payment.failed', function (response) {
      var params = new URLSearchParams({
        status: 'failed',
        reason: (response.error && response.error.description) || ''
      });
      window.location.href = redirectUri + '?' + params.toString();
    });

    rzp.open();
  </script>
</body>
</html>`;
  }
}
