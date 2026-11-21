# Partner-lead TLS fixtures (Story 12.5, Task 4)

Test-only certificates for `apps/jobs/tests/partner-lead-client.test.ts` and `module-lead-handoff.test.ts`. The tests run a local
`https.createServer` and pass `ca-cert.pem` to `createPartnerLeadClient`'s `testSeam.ca`, so the REAL `https.request`, TLS and SNI
run — only the address and port are bent. **Nothing here is a production credential.**

| File | What |
|---|---|
| `ca-cert.pem` | A self-signed test CA (`CN=TWT test partner-lead CA`). Its private key was DELETED after signing — no new leaf can be signed from it. |
| `partner-cert.pem` / `partner-key.pem` | A leaf for `DNS:partner.test` — the "right name" server. |
| `other-cert.pem` / `other-key.pem` | A leaf for `DNS:other.test` — the "certificate for a different name" leg (AC4). |

Made on 2026-11-21 with OpenSSL, valid for 36 500 days (to 2126 — so no test can fail on a DATE):

```sh
openssl req -x509 -newkey rsa:2048 -nodes -keyout ca.key -out ca-cert.pem -days 36500 \
  -subj "/CN=TWT test partner-lead CA" -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign"
for n in partner other; do
  openssl req -newkey rsa:2048 -nodes -keyout $n-key.pem -out $n.csr -subj "/CN=$n.test"
  printf "subjectAltName=DNS:%s.test\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n" $n > $n.ext
  openssl x509 -req -in $n.csr -CA ca-cert.pem -CAkey ca.key -CAcreateserial -out $n-cert.pem -days 36500 -extfile $n.ext
done
rm ca.key ca-cert.srl *.csr *.ext
```

To replace them, re-run the block (a new CA invalidates both leaves together).
