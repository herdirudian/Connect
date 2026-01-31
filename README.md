# Family The Lodge Membership System

Sistem membership terintegrasi untuk The Lodge Maribaya.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: SQLite (Development) / PostgreSQL or MySQL (Production)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Auth**: JWT (Custom Implementation)

## Cara Menjalankan

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Setup Database**
    Secara default, project ini menggunakan SQLite untuk kemudahan development.
    ```bash
    npx prisma db push
    ```

    *Untuk menggunakan MySQL/PostgreSQL:*
    - Edit `.env` dan ubah `DATABASE_URL`.
    - Edit `prisma/schema.prisma` dan ubah provider dari `sqlite` ke `mysql` atau `postgresql`.
    - Hapus folder `prisma/migrations` jika ada conflict.

3.  **Jalankan Server Development**
    ```bash
    npm run dev
    ```

4.  **Akses Aplikasi**
    Buka [http://localhost:3000](http://localhost:3000).

## Fitur Utama
- **Registrasi & Login Member**: Dengan JWT dan hashing password aman.
- **Dashboard Member**: Menampilkan status membership, poin, dan kartu digital.
- **Digital Member Card**: QR Code unik untuk setiap member yang digenerate otomatis.
- **Tiering System**: Struktur database siap untuk level Explorer, Nature Lover, Lodge Guardian.

## Struktur Project
- `/src/app`: Halaman-halaman website (App Router).
- `/src/components`: Komponen UI (Button, Card, MemberCard).
- `/src/lib`: Utility functions (Prisma client, Auth helpers).
- `/prisma`: Schema database.
