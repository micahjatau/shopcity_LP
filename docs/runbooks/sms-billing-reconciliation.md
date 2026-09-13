# SMS billing reconciliation

SMS cost remains `UNAVAILABLE` until invoice-accurate tariff data is approved.
No provider response, message body, phone number, or guessed price is used as a
financial source.

When tariff data is available:

1. Obtain the provider invoice and tariff effective dates from an authorized
   operator.
2. Match invoice units to the application’s provider message identifier using
   a masked evidence export.
3. Apply the approved integer minor-unit tariff by message type and country;
   record currency and tariff version.
4. Reconcile sent, failed, and delivered counts separately. Document provider
   billing rules for retries and multipart messages.
5. Compare invoice total to the computed total, investigate differences, and
   obtain supervisor approval before publishing costs.
6. Retain only the reconciliation result, tariff version, counts, and masked
   identifiers; discard raw invoice/provider payloads from application logs.

Until these steps are completed, reports must display `UNAVAILABLE`, not an
estimate presented as an invoice-accurate amount.
