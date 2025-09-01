// Ini adalah implementasi placeholder sederhana untuk enkripsi dan dekripsi.
// Anda mungkin perlu menyesuaikannya dengan logika enkripsi Anda yang sebenarnya.
class Encoder {
  /**
   * Mengenkripsi data menjadi string Base64.
   */
  static async enc({ data }) {
    const jsonString = JSON.stringify(data);
    const encoded = Buffer.from(jsonString).toString('base64');
    return { uuid: encoded };
  }

  /**
   * Mendekripsi string Base64 kembali menjadi data.
   */
  static async dec({ uuid }) {
    const decodedString = Buffer.from(uuid, 'base64').toString('utf-8');
    const jsonData = JSON.parse(decodedString);
    return { text: jsonData };
  }
}

export default Encoder;