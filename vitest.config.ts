import { defineLibraryTest } from "@sharadox/vitest-configuration-web-library/library-test";

export default defineLibraryTest({ root: new URL("./", import.meta.url) });
