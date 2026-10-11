import dns from 'dns/promises';

export const dnsProvider = {
  async resolveTxt(hostname) {
    return dns.resolveTxt(hostname);
  },
  async resolveCname(hostname) {
    return dns.resolveCname(hostname);
  },
  async resolve4(hostname) {
    return dns.resolve4(hostname);
  }
};