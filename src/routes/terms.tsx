import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "Terms of Service — Deewhy HQ Preview Studio" },
    { name: "description", content: "Terms for accounts, homepage recordings, downloads and responsible use of Deewhy HQ Preview Studio." },
    { property: "og:title", content: "Terms of Service — Deewhy HQ Preview Studio" },
    { property: "og:description", content: "Your responsibilities when recording public homepages with Deewhy HQ Preview Studio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TermsPage,
});

function TermsPage() {
  return <LegalPage title="Terms of Service">
    <section><h2>1. Using Preview Studio</h2><p>These terms apply to Deewhy HQ Preview Studio, operated under the Deewhy HQ name. By using the service, you agree to these terms. If you do not agree, do not use the service. You must be legally able to agree to these terms; if you are below the legal age of majority, use the service only with a parent or guardian’s permission.</p></section>
    <section><h2>2. Your account</h2><p>Provide accurate account information, keep your sign-in details secure, and do not share access to another person’s account. You are responsible for activity under your account. Do not impersonate another person or attempt to access someone else’s recordings.</p></section>
    <section><h2>3. Homepage recordings</h2><p>The service records publicly accessible website homepages as desktop scroll-through MP4s and can produce laptop-frame images from finished recordings. It does not give permission to copy any website. Only record content you own, have permission to use, or may lawfully record and share. Do not submit links containing passwords, access tokens, personal data or other confidential information.</p><p>Websites may block recording or behave differently in an automated browser. Dynamic content, animations, very long pages and network conditions may affect the result. A successful result or an exact recording time is not guaranteed.</p></section>
    <section><h2>4. Responsible use</h2><p>Do not use the service to infringe copyrights or trademarks, violate privacy, distribute unlawful content, bypass login or security restrictions, probe private networks, overload the recording service, or interfere with other users. We may restrict or suspend abusive use to protect the service.</p></section>
    <section><h2>5. Content and ownership</h2><p>You retain rights you already hold in your content. Third-party website owners retain their own rights. You grant us only the permission needed to load the submitted homepage, create your requested output, store it and deliver it to you. Recordings do not transfer ownership of the underlying website or grant a licence to third-party material. You are responsible for checking rights before publishing or using downloads commercially.</p></section>
    <section><h2>6. Free service and availability</h2><p>Account creation, recordings and downloads are currently free for users. Capacity and fair-use limits may apply, including limits on simultaneous recordings. We may change or discontinue features and will disclose any future charges before asking you to pay. Keep your own copies of important downloads; this service is not a permanent archive.</p></section>
    <section><h2>7. Privacy and removal</h2><p>Our <Link to="/privacy">Privacy Policy</Link> explains how account data, submitted URLs and recordings are handled. You can remove individual recordings in the Studio. Account deletion and other privacy requests require verification of account ownership.</p></section>
    <section><h2>8. Limitations</h2><p>To the extent allowed by applicable law, the service is provided as available, without promises of uninterrupted operation or suitability for a particular purpose. We are not responsible for third-party websites or your use of their content. Nothing in these terms excludes rights, remedies or liabilities that cannot lawfully be excluded.</p></section>
    <section><h2>9. Updates and enquiries</h2><p>Changes will be posted on this page with an updated effective date. Material changes will be communicated where reasonably practicable. For service or rights enquiries, contact the Deewhy HQ operator through the channel through which you obtained the service; a dedicated public support address has not yet been published.</p></section>
  </LegalPage>;
}