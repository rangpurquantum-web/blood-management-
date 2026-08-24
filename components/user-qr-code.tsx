async function loadQr() {
  setLoading(true);
  setDataUrl(null);

  try {
    const res = await fetch(`/api/users/${userId}/qr`);

    if (!res.ok) {
      throw new Error("Failed to load QR");
    }

    const { token } = await res.json();

    if (!token) {
      throw new Error("QR token পাওয়া যায়নি");
    }

    await renderQr(token);
  } catch (error) {
    console.error("QR load error:", error);
    toast.error("QR কোড লোড করা যায়নি");
  } finally {
    setLoading(false);
  }
}