import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useVerifiedBsuOrganizations } from '@/hooks/useOrganizations';
import {
  useMarketplaceProducts,
  useCreateMarketplaceProduct,
} from '@/hooks/useProducts';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { formatCurrency } from '@/lib/utils';

export interface MarketplaceItem {
  id: string;
  nama: string;
  kategori: string;
  bankSampah: string;
  harga: number;
  status: 'tersedia' | 'direservasi' | 'terjual';
  deskripsi?: string;
  kondisi?: string;
  iconType: 'diamond' | 'square' | 'book';
}

const INITIAL_ITEMS: MarketplaceItem[] = [
  {
    id: 'item-1',
    nama: 'SIM · Tempat arsip',
    kategori: 'Lainnya',
    bankSampah: 'Bank Sampah Demo Selatan',
    harga: 18000,
    status: 'tersedia',
    deskripsi: 'Tempat arsip map dokumen berbahan plastik tebal, bersih dan kokoh.',
    kondisi: 'Sangat baik (9/10)',
    iconType: 'diamond',
  },
  {
    id: 'item-2',
    nama: 'SIM · Keyboard USB',
    kategori: 'Elektronik layak pakai',
    bankSampah: 'Bank Sampah Demo Selatan',
    harga: 45000,
    status: 'tersedia',
    deskripsi: 'Keyboard USB kabel standar kantoran, semua tombol sudah diuji dan berfungsi normal.',
    kondisi: 'Berfungsi normal (8/10)',
    iconType: 'square',
  },
  {
    id: 'item-3',
    nama: 'SIM · Buku praktikum',
    kategori: 'Buku',
    bankSampah: 'Bank Sampah Demo Selatan',
    harga: 30000,
    status: 'tersedia',
    deskripsi: 'Buku modul praktikum teknik & sains dasar, halaman lengkap tanpa coretan tebal.',
    kondisi: 'Halaman lengkap & rapi',
    iconType: 'book',
  },
  {
    id: 'item-4',
    nama: 'SIM · Rak kayu',
    kategori: 'Perabot',
    bankSampah: 'Bank Sampah Demo Selatan',
    harga: 90000,
    status: 'direservasi',
    deskripsi: 'Rak susun kayu jati belanda 3 tingkat, cocok untuk buku atau tanaman hias.',
    kondisi: 'Kokoh dan sudah dipelitur ulang',
    iconType: 'diamond',
  },
  {
    id: 'item-5',
    nama: 'SIM · Tempat arsip',
    kategori: 'Lainnya',
    bankSampah: 'Bank Sampah Demo Utara',
    harga: 18000,
    status: 'tersedia',
    deskripsi: 'Box file tempat arsip meja warna abu-abu netral, tidak ada retak.',
    kondisi: 'Mulus layak pakai',
    iconType: 'diamond',
  },
  {
    id: 'item-6',
    nama: 'SIM · Keyboard USB',
    kategori: 'Elektronik layak pakai',
    bankSampah: 'Bank Sampah Demo Utara',
    harga: 45000,
    status: 'tersedia',
    deskripsi: 'Keyboard membran USB hitam, kabel utuh, cocok untuk PC lab/sekolah.',
    kondisi: 'Siap pakai',
    iconType: 'square',
  },
];

export function MarketplacePage() {
  usePageTitle('Marketplace Guna Ulang');

  const [localItems, setLocalItems] = useState<MarketplaceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState('Semua bank');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Supabase hooks
  const productsQuery = useMarketplaceProducts();
  const createProductMutation = useCreateMarketplaceProduct();
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Modal State
  const [detailItem, setDetailItem] = useState<MarketplaceItem | null>(null);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [bidAmount, setBidAmount] = useState<number | ''>('');
  const [bidNotes, setBidNotes] = useState('');

  // Tawarkan Barang Modal State
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Lainnya');
  const [newBank, setNewBank] = useState('Bank Sampah Demo Selatan');
  const [newPrice, setNewPrice] = useState<number | ''>('');
  const [newCondition, setNewCondition] = useState('Layak pakai (8/10)');
  const [newDescription, setNewDescription] = useState('');
  const [createSuccessToast, setCreateSuccessToast] = useState(false);

  const bsuQuery = useVerifiedBsuOrganizations();
  const bsuList = bsuQuery.data ?? [];

  // Transform database products to UI items
  const items = useMemo(() => {
    const dbProducts = productsQuery.data ?? [];

    const dbMapped: MarketplaceItem[] = dbProducts.map((p) => {
      const bankMatch = p.deskripsi?.match(/\[Bank:\s*([^\]]+)\]/);
      const kondisiMatch = p.deskripsi?.match(/\[Kondisi:\s*([^\]]+)\]/);

      const cleanDeskripsi =
        p.deskripsi
          ?.replace(/\[Bank:\s*[^\]]+\]/g, '')
          .replace(/\[Kondisi:\s*[^\]]+\]/g, '')
          .trim() ||
        p.deskripsi ||
        '';

      const bankName = bankMatch
        ? bankMatch[1]
        : p.org?.nama || 'Bank Sampah Demo Selatan';
      const kondisiName = kondisiMatch ? kondisiMatch[1] : 'Layak pakai (8/10)';

      let iconType: 'diamond' | 'square' | 'book' = 'diamond';
      const katLower = (p.kategori || '').toLowerCase();
      if (katLower.includes('elektronik')) iconType = 'square';
      if (katLower.includes('buku') || katLower.includes('tulis')) iconType = 'book';

      return {
        id: p.id,
        nama: p.nama,
        kategori: p.kategori || 'Lainnya',
        bankSampah: bankName,
        harga: p.harga,
        status: p.stok <= 0 ? 'direservasi' : 'tersedia',
        deskripsi: cleanDeskripsi,
        kondisi: kondisiName,
        iconType,
      };
    });

    const existingNames = new Set(dbMapped.map((d) => d.nama.toLowerCase()));
    const demoFallback = INITIAL_ITEMS.filter(
      (item) => !existingNames.has(item.nama.toLowerCase()),
    );

    const existingIds = new Set([
      ...dbMapped.map((d) => d.id),
      ...demoFallback.map((d) => d.id),
    ]);
    const uniqueLocal = localItems.filter((item) => !existingIds.has(item.id));

    return [...uniqueLocal, ...dbMapped, ...demoFallback];
  }, [productsQuery.data, localItems]);

  const bankOptions = useMemo(() => {
    const defaultBanks = ['Semua bank', 'Bank Sampah Demo Selatan', 'Bank Sampah Demo Utara'];
    const dynamicBanks = bsuList.map((b) => b.nama);
    return Array.from(new Set([...defaultBanks, ...dynamicBanks]));
  }, [bsuList]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        searchQuery === '' ||
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kategori.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.deskripsi && item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchBank =
        selectedBank === 'Semua bank' || item.bankSampah.toLowerCase() === selectedBank.toLowerCase();

      return matchSearch && matchBank;
    });
  }, [items, searchQuery, selectedBank]);

  const handleOpenDetail = (item: MarketplaceItem) => {
    setDetailItem(item);
    setBidAmount(item.harga);
    setBidNotes('');
    setOfferSuccess(false);
  };

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault();
    setOfferSuccess(true);
    setTimeout(() => {
      setDetailItem(null);
      setOfferSuccess(false);
    }, 2500);
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPrice) return;

    setSubmittingOffer(true);
    try {
      await createProductMutation.mutateAsync({
        nama: newTitle.trim(),
        kategori: newCategory,
        bankSampah: newBank,
        harga: Number(newPrice),
        kondisi: newCondition,
        deskripsi: newDescription,
      });
    } catch (err) {
      console.warn('Gagal insert ke Supabase (role atau policy), menyimpan secara lokal:', err);
      let icon: 'diamond' | 'square' | 'book' = 'diamond';
      if (newCategory.toLowerCase().includes('elektronik')) icon = 'square';
      if (newCategory.toLowerCase().includes('buku')) icon = 'book';

      const newItem: MarketplaceItem = {
        id: `local-${Date.now()}`,
        nama: newTitle.trim().startsWith('SIM · ')
          ? newTitle.trim()
          : `SIM · ${newTitle.trim()}`,
        kategori: newCategory,
        bankSampah: newBank,
        harga: Number(newPrice),
        status: 'tersedia',
        deskripsi:
          newDescription || 'Barang telah diperiksa kondisinya oleh warga pemilik.',
        kondisi: newCondition,
        iconType: icon,
      };

      setLocalItems((prev) => [newItem, ...prev]);
    } finally {
      setSubmittingOffer(false);
      setIsOfferModalOpen(false);
      setNewTitle('');
      setNewPrice('');
      setNewDescription('');

      setCreateSuccessToast(true);
      setTimeout(() => setCreateSuccessToast(false), 3500);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Toast Notification */}
      {createSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-[#0e4835] px-5 py-3.5 text-white shadow-xl transition-all animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-xs font-bold">Barang berhasil diajukan!</p>
            <p className="text-[11px] text-emerald-100">
              Barangmu kini tampil di katalog & menunggu verifikasi bank sampah.
            </p>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#0e4835]">
            Beri barang kesempatan berikutnya
          </p>
          <h1 className="text-3xl font-black tracking-tight text-[#112316] sm:text-4xl">
            Marketplace guna ulang.
          </h1>
          <p className="text-sm leading-relaxed text-[#4b5a4d]">
            Temukan barang layak pakai dari komunitas. Ajukan tawaran, lalu selesaikan transaksi melalui
            bank sampah yang memverifikasi barang.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOfferModalOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0e4835] px-5 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-[#0a3627] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Tawarkan barang
        </button>
      </div>

      {/* Filter & Search Bar Card */}
      <div className="rounded-3xl border border-black/[0.08] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.5fr_1fr_auto]">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#3d4c3f]">
              Cari barang
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Komputer, buku, kursi..."
                className="h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-xs text-[#132417] placeholder:text-[#88988a] focus:border-[#0e4835] focus:outline-none focus:ring-2 focus:ring-[#0e4835]/15"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#3d4c3f]">
              Bank sampah
            </label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-xs text-[#132417] focus:border-[#0e4835] focus:outline-none focus:ring-2 focus:ring-[#0e4835]/15"
            >
              {bankOptions.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {}}
              className="h-11 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0e4835] px-6 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#0a3627] active:scale-[0.98]"
            >
              Cari barang
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Feature Badges / Quick Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/[0.04]">
          {[
            { label: 'Layak pakai', desc: 'Barang dicek fungsi & kelayakan' },
            { label: 'Verifikasi bank sampah', desc: 'Fisik disimpan & dicek pengurus BSU' },
            { label: 'Pembayaran dan serah terima di bank', desc: 'Transaksi aman tanpa tipu-tipu' },
          ].map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => setActiveTag(activeTag === tag.label ? null : tag.label)}
              title={tag.desc}
              className={`rounded-full px-3.5 py-1 text-[11px] font-semibold transition-colors ${
                activeTag === tag.label
                  ? 'bg-[#0e4835] text-white'
                  : 'border border-black/[0.08] bg-[#f5f8f4] text-[#415344] hover:bg-[#ebf0ea]'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-[#556757]">
            Menampilkan <span className="text-[#132417] font-extrabold">{filteredItems.length}</span> barang
            guna ulang
          </p>
          {(searchQuery || selectedBank !== 'Semua bank') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedBank('Semua bank');
                setActiveTag(null);
              }}
              className="text-xs font-semibold text-[#0e4835] hover:underline"
            >
              Reset filter
            </button>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-black/8 bg-white p-12 text-center">
            <Store className="mx-auto h-12 w-12 text-[#9bb09e]" />
            <h3 className="mt-4 text-sm font-bold text-[#142618]">Tidak ada barang yang cocok</h3>
            <p className="mt-1 text-xs text-[#6e8070]">
              Coba ganti kata kunci pencarian atau pilih bank sampah lainnya.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col justify-between overflow-hidden rounded-[26px] border border-black/[0.08] bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-black/15"
              >
                {/* Visual Area */}
                <div>
                  <div className="relative flex h-52 w-full items-center justify-center rounded-[20px] bg-[#ecf2ea] transition-colors group-hover:bg-[#e4ece2]">
                    {/* Category Badge */}
                    <span className="absolute left-3.5 top-3.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-[#2d4933] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                      {item.kategori}
                    </span>

                    {/* Minimalist Geometric Icon Representation */}
                    {item.iconType === 'diamond' && (
                      <div className="flex h-14 w-14 rotate-45 items-center justify-center border-2 border-[#546b57]/70 bg-transparent transition-transform duration-300 group-hover:scale-110" />
                    )}

                    {item.iconType === 'square' && (
                      <div className="flex h-12 w-12 items-center justify-center border-2 border-[#546b57]/70 bg-transparent p-2 transition-transform duration-300 group-hover:scale-110">
                        <div className="h-5 w-5 border border-[#546b57]/80 bg-[#546b57]/20" />
                      </div>
                    )}

                    {item.iconType === 'book' && (
                      <div className="flex h-14 w-11 flex-col justify-between rounded-sm border-2 border-[#546b57]/70 bg-transparent p-2 transition-transform duration-300 group-hover:scale-110">
                        <div className="h-0.5 w-full bg-[#546b57]/70" />
                        <div className="h-0.5 w-full bg-[#546b57]/70" />
                        <div className="h-0.5 w-full bg-[#546b57]/70" />
                        <div className="h-0.5 w-full bg-[#546b57]/70" />
                      </div>
                    )}
                  </div>

                  {/* Details Area */}
                  <div className="mt-4 space-y-1">
                    <h3 className="text-sm font-extrabold text-[#132417] leading-snug">
                      {item.nama}
                    </h3>
                    <p className="text-xs text-[#708072] font-medium">{item.bankSampah}</p>
                    <p className="pt-1.5 text-base font-black text-[#113a26]">
                      {formatCurrency(item.harga)}
                    </p>

                    {item.status === 'direservasi' && (
                      <p className="pt-1 text-[11px] font-semibold text-amber-700">
                        Sedang direservasi
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(item)}
                    className="w-full rounded-full border border-black/10 bg-white py-2.5 text-center text-xs font-bold text-[#142618] transition-all hover:border-black/25 hover:bg-[#f8faf7] active:scale-[0.99]"
                  >
                    {item.status === 'direservasi' ? 'Lihat barang →' : 'Lihat dan tawar →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Detail & Tawar */}
      {detailItem && (
        <Modal
          open={Boolean(detailItem)}
          onClose={() => setDetailItem(null)}
          title={detailItem.nama}
          description={`${detailItem.kategori} · ${detailItem.bankSampah}`}
          size="md"
        >
          <div className="space-y-5">
            {offerSuccess ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <h4 className="text-sm font-bold text-emerald-900">Tawaran Berhasil Dikirim!</h4>
                <p className="text-xs text-emerald-700 leading-relaxed max-w-md mx-auto">
                  Pengurus {detailItem.bankSampah} telah menerima tawaranmu. Kamu akan dihubungi untuk
                  verifikasi kondisi barang dan pengambilan di kantor bank sampah.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-[#ecf2ea] p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#546b57] font-bold">
                      Harga Penawaran Awal
                    </p>
                    <p className="text-2xl font-black text-[#113a26]">
                      {formatCurrency(detailItem.harga)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      detailItem.status === 'direservasi'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {detailItem.status === 'direservasi' ? 'Sedang Direservasi' : 'Tersedia'}
                  </span>
                </div>

                <div className="space-y-3 text-xs text-[#334636]">
                  <div>
                    <span className="font-bold text-[#132417]">Kondisi: </span>
                    {detailItem.kondisi || 'Layak pakai'}
                  </div>
                  <div>
                    <span className="font-bold text-[#132417]">Deskripsi: </span>
                    {detailItem.deskripsi}
                  </div>
                </div>

                {/* Safe Transaction Banner */}
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-900/10 bg-emerald-50/60 p-3.5 text-xs text-emerald-900">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Alur Transaksi Aman:</strong> Barang diverifikasi langsung oleh petugas Bank
                    Sampah. Pembayaran dan serah terima dilakukan saat Anda mengecek barang di lokasi Bank
                    Sampah.
                  </p>
                </div>

                {detailItem.status === 'tersedia' ? (
                  <form onSubmit={handleSubmitBid} className="space-y-4 pt-2 border-t border-black/8">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#142318]">
                        Nominal Tawaran Anda (Rp)
                      </label>
                      <Input
                        type="number"
                        min={1000}
                        step={1000}
                        required
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Masukkan harga tawaran"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#142318]">
                        Catatan untuk Pemilik / Pengurus Bank Sampah
                      </label>
                      <Textarea
                        rows={2}
                        value={bidNotes}
                        onChange={(e) => setBidNotes(e.target.value)}
                        placeholder="Contoh: Apakah bisa saya ambil hari Sabtu siang?"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setDetailItem(null)}
                      >
                        Tutup
                      </Button>
                      <Button
                        type="submit"
                        className="bg-[#0e4835] hover:bg-[#0a3627] text-white"
                      >
                        Kirim Tawaran
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="pt-2 text-center text-xs text-amber-800 bg-amber-50 rounded-xl p-3">
                    Barang ini sedang direservasi oleh pembeli lain. Anda tetap dapat memantau statusnya.
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Tawarkan Barang Baru */}
      <Modal
        open={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        title="Tawarkan Barang Guna Ulang"
        description="Barang layak pakai Anda akan diperiksa dan ditampung oleh Bank Sampah mitra terdekat."
        size="md"
      >
        <form onSubmit={handleCreateOffer} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#142318]">Nama Barang</label>
            <Input
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Contoh: Tempat arsip plastik / Monitor 20 inch"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#142318]">Kategori</label>
              <Select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                <option value="Lainnya">Lainnya</option>
                <option value="Elektronik layak pakai">Elektronik layak pakai</option>
                <option value="Buku">Buku</option>
                <option value="Perabot">Perabot</option>
                <option value="Pakaian">Pakaian</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#142318]">Bank Sampah Tujuan</label>
              <Select
                value={newBank}
                onChange={(e) => setNewBank(e.target.value)}
              >
                {bankOptions
                  .filter((b) => b !== 'Semua bank')
                  .map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#142318]">Harga yang Diharapkan (Rp)</label>
              <Input
                type="number"
                min={1000}
                step={1000}
                required
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="25000"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#142318]">Perkiraan Kondisi</label>
              <Input
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="Contoh: Mulus (8.5/10), semua tombol aktif"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#142318]">Deskripsi / Catatan Barang</label>
            <Textarea
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Ceritakan detail barang, fungsi, atau kelengkapan yang disertakan..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/8">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOfferModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submittingOffer}
              className="bg-[#0e4835] hover:bg-[#0a3627] text-white"
            >
              {submittingOffer ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan ke DB…
                </>
              ) : (
                'Publikasikan Barang'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
