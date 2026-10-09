# AdvOne — Project Notes

## Rules

- External web-search/scraping calls from edge functions must go through the Lovable connector gateway (`https://connector-gateway.lovable.dev/firecrawl/...`) with both the Lovable API key and the connection key headers, never directly to the provider API — the workspace connection is gateway-backed, so direct provider calls authenticate with the wrong credential and fail.
