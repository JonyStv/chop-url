export const uaMiddleware = (req, res, next) => {
  res.setHeader(
    "Accept-CH",
    "Sec-CH-UA, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Mobile, Sec-CH-UA-Arch, Sec-CH-UA-Model, Sec-CH-UA-Bitness",
  );
  next();
};
