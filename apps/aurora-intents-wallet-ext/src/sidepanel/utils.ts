export const shortAddress = (address: string, head = 6, tail = 4) =>
  address.length > head + tail + 1
    ? `${address.slice(0, head)}…${address.slice(-tail)}`
    : address;
