import dns from 'dns/promises';

export const dnsProvider = {
  async resolveTxt(hostname) {
    return dns.resolveTxt(hostname);
  },
  async resolveCname(hostname) {
    return dns.resolveCname(hostname);
  },
};