/**
 * Konvensi commit proyek: prefix bertanda kurung siku UPPERCASE.
 * Format: `[TAG] deskripsi singkat`  (mis. `[FEAT] tambah login`).
 * Lihat docs/conventions.md untuk daftar tag.
 */
module.exports = {
  parserPreset: {
    parserOpts: {
      headerPattern: /^\[(\w+)\]\s(.+)$/,
      headerCorrespondence: ["type", "subject"],
    },
  },
  rules: {
    "type-empty": [2, "never"],
    "type-enum": [
      2,
      "always",
      [
        "FEAT", // fitur baru
        "FIX", // perbaikan bug
        "IMP", // improvement / peningkatan
        "REF", // refactor
        "DOCS", // dokumentasi
        "TEST", // test
        "CHORE", // pemeliharaan / tooling
        "PERF", // performa
        "BUILD", // build system / dependency
        "CI", // pipeline CI
        "STYLE", // format / lint (tanpa ubah logika)
        "REVERT", // revert commit
      ],
    ],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 100],
  },
};
