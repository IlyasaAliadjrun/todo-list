# ADR 0001 — Mencatat keputusan arsitektur

- **Status:** Diterima
- **Tanggal:** (isi)

## Konteks

Proyek dikembangkan bertahap oleh manusia + Claude Code lintas banyak sesi. Keputusan
arsitektur penting mudah terlupa atau berubah tanpa alasan yang tercatat, menimbulkan
inkonsistensi.

## Keputusan

Setiap keputusan arsitektur signifikan dicatat sebagai ADR (Architecture Decision
Record) di `docs/adr/`, bernomor urut. Format singkat: Konteks, Keputusan, Konsekuensi.

## Konsekuensi

- Ada jejak alasan keputusan (stack, pola, trade-off).
- Perubahan besar wajib lewat ADR baru, bukan diam-diam.

---

## Template ADR (salin untuk ADR berikutnya)

```
# ADR NNNN — Judul singkat

- Status: Diusulkan | Diterima | Digantikan oleh ADR-xxxx
- Tanggal: YYYY-MM-DD

## Konteks
Apa masalah/kebutuhannya, kendala yang relevan.

## Keputusan
Apa yang diputuskan dan alasannya. Alternatif yang dipertimbangkan & kenapa ditolak.

## Konsekuensi
Dampak positif, negatif, dan hal yang perlu diwaspadai ke depan.
```

## Keputusan awal yang sudah ditetapkan (rangkuman)

1. **Monorepo** pnpm + Turborepo.
2. **BlockNote** sebagai block editor (tidak membangun dari nol).
3. **Yjs/CRDT + Hocuspocus** untuk kolaborasi real-time.
4. **NestJS + PostgreSQL/Prisma + Redis** untuk backend.
5. **Target Ubuntu 20.04** untuk instalasi; service stateful di container.

Jika salah satu ini akan diubah, tulis ADR baru yang menggantikannya.
