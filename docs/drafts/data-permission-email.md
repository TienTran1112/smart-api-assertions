# Draft: data-permission question (W1)

Send the same question to the supervisor and to the Onix Work owner, in writing. Keep the reply
with the project documents: the answer decides between redaction and Track B (plan, section 2).

---

**Subject:** Permission to send Onix Work test-API responses to an external LLM service (capstone)

Dear [name],

For my capstone project, "Smart API Assertions", I test whether an LLM judge can check the
meaning of server-written messages in API responses (error and validation messages, status
explanations) more robustly than exact-match or keyword assertions.

The experiments would send text from the **Onix Work test environment**
(`openapi-test.onixwork.com`) to Anthropic's Claude API. In detail:

- **What is sent:** only the message text and the expected criteria, for example
  "The Username field is required." No credentials, API keys or tokens are ever sent.
- **Before sending:** an automatic redaction step removes e-mail addresses, phone numbers,
  GUIDs/internal IDs and tokens from the text.
- **Which data:** responses from the test environment with the test account only; no production
  data and no real customer data.
- **Retention:** API inputs are handled under Anthropic's commercial API terms, which by default
  do not use them for model training ([check the current policy and link it here before
  sending]). The responses and judge results are stored in my project repository, which stays
  private / [shared only with the supervisor].

Could you confirm which of these applies?

1. Yes, test-API responses may be sent as described.
2. Yes, but only after redaction (as above, or with additional rules: please say which).
3. No. In that case I will build a small mock API with Onix-shaped responses and use Onix only
   for a live demo that sends nothing outside.

A short written reply is enough. Thank you very much.

Kind regards,
Tran Thuy Tien
