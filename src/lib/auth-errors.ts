export function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Email atau password tidak sesuai. Silakan coba lagi.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Email belum dikonfirmasi. Periksa kotak masuk lalu konfirmasi akun Anda.';
  }
  if (normalized.includes('user already registered')) {
    return 'Email ini sudah terdaftar. Silakan masuk ke akun Anda.';
  }
  if (normalized.includes('password should be at least')) {
    return 'Password minimal 8 karakter.';
  }
  if (normalized.includes('unable to validate email')) {
    return 'Format email belum valid.';
  }
  if (normalized.includes('email rate limit exceeded')) {
    return 'Terlalu banyak percobaan email. Tunggu beberapa saat lalu coba lagi.';
  }
  if (normalized.includes('signup is disabled')) {
    return 'Pendaftaran akun sedang dinonaktifkan.';
  }
  if (normalized.includes('network')) {
    return 'Koneksi ke server gagal. Periksa jaringan Anda.';
  }

  return message;
}
