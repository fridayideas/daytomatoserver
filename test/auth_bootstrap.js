const jwt = require('jsonwebtoken');
const OAuth2Client = require('google-auth-library/lib/auth/oauth2client');

const kid = 'asdf-1234-qwerty-56789';
const authConf = {
  privKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA4hhVnwXfvuNxz8x6chxi/euacpyjWXqWCF4sLIziLH/yRURu\nDPn2b9UH2RgfzzZCyfe+1rSCOmhsh3WmZ2gjiJyMbHXxD0/1biz/eHptJ2ytAG8B\nVk0jppdiFkdifEFhuDk8YcMuYABNxlgq7/55MK3hnlyGlOO4uDTIkG77AYOD5T/p\ncPLskp5TGAkaaNHGOn9g8XfhfBB7wJ67AtLmxCc3aC9ItTXofkogoKKXM/qpbhvR\n6QH0pldlRKIt1V+H/36TJZ74SvhjQWaUK0XMybe3Cc/HZ1yMzzgeheyRmrzzf4Wi\nHFG2/b53wtlfvcKicTe9COwSpo33p05Bd6Pb7wIDAQABAoIBAGpJmE62uzWIxOM0\nNEfasmq+TJAetOgGqetrIgcbf+P9jg4kGjw9ci2mjxbusV1/G6zIq81RdHsyxfp0\nQ3MPUM0TEyyV0WoqY62Ut9CSdSf4fefbR1yjzOOu/OyOSG0za1XoiktHL1DwM5/P\nqPfDwIMy6wLAaoAqAZePMM49bgCKSb1oxqIIlEL1T7grs040t0wpoMsDGCt5zvft\nkqnZIQkfu7K2Lp3z93DN+dSWiaG/fu0EURsmMhDuxaLER1G/SX8nXHgUTpfTJzFA\naP6ez+Bl4sM1PhJVuM8y17Kd8TwDf7xCtUmn7HykAAu7I1Q2fKUv7Aya7qhiGRWI\nThtRyCECgYEA9osdT3xE9WqgH8bfM56JaEOTA4Pb266EnSDy3oQ4gCSrQlDKaGzV\n6DHFMnr/siPqsImug+Y2rBsuS1thmjLvU2aR0f+HmUSVe7uGLqcG/YvVecmOaLJ0\nC2sRQC7W5ZZlUypPnVgfxpa/sZ1/ZI6nRRl1xV+YaU2TiJM1gz1mhF8CgYEA6sRu\nZeqdgrsP5uBLplglgWmxAQP7q0bvwGWVyXidJvaxGtpwNQta8iROql87qKCK8ZWN\nr1VaNYws9dYO/p/VHHBNUc0RV2VdATH5ErCLKuIAffAUSjYTz+XUO9lJEwK3RJnC\nO5q/KX2Vg9C4W3Xi/utIrNlJutG/QGAOglIjUnECgYEAmcpDmV6KYZCGm+vhNYDy\nc9CbNzkcf1fIr39rILTXzc+R6Qcei69Aa9wIB6pEMCpJbqAj9XE4r3kxEp7JLngR\nZDP6SEWen1Px70IVvKpCKQz+OD8rj1GqI6lBFIljUcnUIOGm0h6zi5xjrXbyjZaS\n7v6nwVwVZbKXkj1JxzkY5v8CgYBdJ8a6sCcCGeIMddHu1qlDOcIfqgnyA7rcuDKA\neFi7fkX2ZtkBY1kaHigM2K8ekV2w0Owgt5iNCOtKPT9D7/4rQ7CalemcqT8HW2H+\n9YizYmxZjKswa1bfNs5JVUX2wiwgj3aQGi5ic0+ht29/8z44cvoqhCoKdHIUREld\nkuQrMQKBgQDQffVIN3PiS24HHtzey9vLNn5VzNbdLVXBY2u8BAdK2KQfQx44pkj2\nR5UlGbnT0C+vmKd2i+sDUaZl3V4NFzByS7PmYsiFt4wIxld19Dq2lI8DYi2oRrh7\nSnS0htpnTERCW1p2EW19u3zQ3BLquvy0OKZ2Ja/UyEFAHs+hEMjgyw==\n-----END RSA PRIVATE KEY-----\n',
  certs: {
    [kid]: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4hhVnwXfvuNxz8x6chxi\n/euacpyjWXqWCF4sLIziLH/yRURuDPn2b9UH2RgfzzZCyfe+1rSCOmhsh3WmZ2gj\niJyMbHXxD0/1biz/eHptJ2ytAG8BVk0jppdiFkdifEFhuDk8YcMuYABNxlgq7/55\nMK3hnlyGlOO4uDTIkG77AYOD5T/pcPLskp5TGAkaaNHGOn9g8XfhfBB7wJ67AtLm\nxCc3aC9ItTXofkogoKKXM/qpbhvR6QH0pldlRKIt1V+H/36TJZ74SvhjQWaUK0XM\nybe3Cc/HZ1yMzzgeheyRmrzzf4WiHFG2/b53wtlfvcKicTe9COwSpo33p05Bd6Pb\n7wIDAQAB\n-----END PUBLIC KEY-----\n',
  },
};

// Patch OAuth client to use our own test certs
// FIXME is there a better way to do this?
Object.assign(OAuth2Client.prototype, {
  getFederatedSignonCerts(cb) {
    cb(null, authConf.certs);
  },
});

exports.TEST_JWT = jwt.sign({
  name: 'TestUser',
}, authConf.privKey, {
  algorithm: 'RS256',
  expiresIn: '1h',
  keyid: kid,
  issuer: 'accounts.google.com',
  subject: process.env.TEST_USER_SUB,
  audience: process.env.AUTH_AUDIENCE,
});
