export default {
  async enc({ data }) {
    return { uuid: Buffer.from(JSON.stringify(data)).toString("base64") };
  },
  async dec({ uuid }) {
    return { text: JSON.parse(Buffer.from(uuid, "base64").toString()) };
  }
};
