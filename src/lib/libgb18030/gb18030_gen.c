/*
 * GB18030 table generator
 *
 * Reads the WHATWG index-gb18030.txt and index-gb18030-ranges.txt files
 * and generates a C header containing:
 *   1. The 2-byte decode table (pointer → Unicode)
 *   2. The 2-byte encode table (Unicode → pointer) for encoding
 *   3. The 4-byte ranges table for extended characters
 *
 * Usage: gb18030_gen <input_dir> <output_file>
 *
 * The input_dir should contain index-gb18030.txt and index-gb18030-ranges.txt
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Entry for the 2-byte encode table: maps Unicode code point to pointer */
typedef struct {
    unsigned int codepoint;
    unsigned int pointer;
} EncodeEntry;

/* Entry for the 4-byte ranges table */
typedef struct {
    unsigned int pointer;
    unsigned int codepoint;
} RangeEntry;

/* Comparison function for sorting encode entries by codepoint */
static int cmp_encode_entry(const void *a, const void *b)
{
    const EncodeEntry *ea = (const EncodeEntry *)a;
    const EncodeEntry *eb = (const EncodeEntry *)b;
    if (ea->codepoint < eb->codepoint) return -1;
    if (ea->codepoint > eb->codepoint) return 1;
    /* Prefer lower pointer for same codepoint */
    if (ea->pointer < eb->pointer) return -1;
    if (ea->pointer > eb->pointer) return 1;
    return 0;
}

int main(int argc, char **argv)
{
    FILE *fin, *fout;
    char line[512];
    char inpath[1024];
    int count = 0;
    int max_pointer = -1;
    int table_size;
    unsigned int *decode_table;
    EncodeEntry *encode_entries;
    int encode_count = 0;
    RangeEntry *range_entries;
    int range_count = 0;
    int range_capacity = 256;
    int i;

    if (argc != 3) {
        fprintf(stderr, "Usage: %s <input_dir> <output_file>\n", argv[0]);
        return 1;
    }

    /* ===== Process the main 2-byte index ===== */
    snprintf(inpath, sizeof(inpath), "%s/index-gb18030.txt", argv[1]);

    /* First pass: find the maximum pointer value and count entries */
    fin = fopen(inpath, "r");
    if (!fin) {
        fprintf(stderr, "Cannot open %s\n", inpath);
        return 1;
    }

    while (fgets(line, sizeof(line), fin)) {
        int pointer;
        unsigned int codepoint;

        if (line[0] == '#' || line[0] == '\n' || line[0] == '\r')
            continue;

        if (sscanf(line, " %d\t0x%X", &pointer, &codepoint) == 2) {
            if (pointer > max_pointer)
                max_pointer = pointer;
            count++;
        }
    }
    fclose(fin);

    if (max_pointer < 0) {
        fprintf(stderr, "gb18030_gen: no entries found in %s\n", inpath);
        return 1;
    }

    table_size = max_pointer + 1;
    decode_table = calloc(table_size, sizeof(unsigned int));
    encode_entries = calloc(count, sizeof(EncodeEntry));
    if (!decode_table || !encode_entries) {
        fprintf(stderr, "gb18030_gen: out of memory\n");
        free(decode_table);
        free(encode_entries);
        return 1;
    }

    /* Second pass: populate the 2-byte tables */
    fin = fopen(inpath, "r");
    if (!fin) {
        fprintf(stderr, "Cannot open %s\n", inpath);
        free(decode_table);
        free(encode_entries);
        return 1;
    }

    while (fgets(line, sizeof(line), fin)) {
        int pointer;
        unsigned int codepoint;

        if (line[0] == '#' || line[0] == '\n' || line[0] == '\r')
            continue;

        if (sscanf(line, " %d\t0x%X", &pointer, &codepoint) == 2) {
            if (pointer >= 0 && pointer < table_size) {
                decode_table[pointer] = codepoint;
                encode_entries[encode_count].codepoint = codepoint;
                encode_entries[encode_count].pointer = pointer;
                encode_count++;
            }
        }
    }
    fclose(fin);

    /* Sort encode entries by codepoint for binary search */
    qsort(encode_entries, encode_count, sizeof(EncodeEntry), cmp_encode_entry);

    /* Remove duplicate codepoints (keep first, i.e., lowest pointer) */
    int unique_count = 0;
    for (i = 0; i < encode_count; i++) {
        if (unique_count == 0 || encode_entries[i].codepoint != encode_entries[unique_count - 1].codepoint) {
            encode_entries[unique_count++] = encode_entries[i];
        }
    }
    encode_count = unique_count;

    fprintf(stderr, "gb18030_gen: read %d 2-byte decode entries (max pointer %d), %d unique encode entries\n",
            count, max_pointer, encode_count);

    /* ===== Process the 4-byte ranges index ===== */
    snprintf(inpath, sizeof(inpath), "%s/index-gb18030-ranges.txt", argv[1]);

    range_entries = malloc(range_capacity * sizeof(RangeEntry));
    if (!range_entries) {
        fprintf(stderr, "gb18030_gen: out of memory\n");
        free(decode_table);
        free(encode_entries);
        return 1;
    }

    fin = fopen(inpath, "r");
    if (!fin) {
        fprintf(stderr, "Cannot open %s\n", inpath);
        free(decode_table);
        free(encode_entries);
        free(range_entries);
        return 1;
    }

    while (fgets(line, sizeof(line), fin)) {
        int pointer;
        unsigned int codepoint;

        if (line[0] == '#' || line[0] == '\n' || line[0] == '\r')
            continue;

        if (sscanf(line, " %d\t0x%X", &pointer, &codepoint) == 2) {
            if (range_count >= range_capacity) {
                range_capacity *= 2;
                RangeEntry *new_entries = realloc(range_entries, range_capacity * sizeof(RangeEntry));
                if (!new_entries) {
                    fprintf(stderr, "gb18030_gen: out of memory\n");
                    free(decode_table);
                    free(encode_entries);
                    free(range_entries);
                    fclose(fin);
                    return 1;
                }
                range_entries = new_entries;
            }
            range_entries[range_count].pointer = pointer;
            range_entries[range_count].codepoint = codepoint;
            range_count++;
        }
    }
    fclose(fin);

    fprintf(stderr, "gb18030_gen: read %d range entries\n", range_count);

    /* ===== Write output file ===== */
    fout = fopen(argv[2], "w");
    if (!fout) {
        fprintf(stderr, "Cannot open %s for writing\n", argv[2]);
        free(decode_table);
        free(encode_entries);
        free(range_entries);
        return 1;
    }

    fprintf(fout, "/* Auto-generated by gb18030_gen from WHATWG index files. Do not edit. */\n\n");

    /* 2-byte decode table */
    fprintf(fout, "#define GB18030_TABLE_SIZE %d\n\n", table_size);
    fprintf(fout, "static const unsigned int gb18030_decode_table[GB18030_TABLE_SIZE] = {\n");

    for (i = 0; i < table_size; i++) {
        if (i % 8 == 0)
            fprintf(fout, "    ");
        fprintf(fout, "0x%04X,", decode_table[i]);
        if (i % 8 == 7 || i == table_size - 1)
            fprintf(fout, "\n");
        else
            fprintf(fout, " ");
    }
    fprintf(fout, "};\n\n");

    /* 2-byte encode table (sorted by codepoint for binary search) */
    fprintf(fout, "#define GB18030_ENCODE_SIZE %d\n\n", encode_count);
    fprintf(fout, "typedef struct {\n");
    fprintf(fout, "    unsigned int codepoint;\n");
    fprintf(fout, "    unsigned int pointer;\n");
    fprintf(fout, "} GB18030EncodeEntry;\n\n");
    fprintf(fout, "static const GB18030EncodeEntry gb18030_encode_table[GB18030_ENCODE_SIZE] = {\n");

    for (i = 0; i < encode_count; i++) {
        if (i % 4 == 0)
            fprintf(fout, "    ");
        fprintf(fout, "{0x%04X, %5d},", encode_entries[i].codepoint, encode_entries[i].pointer);
        if (i % 4 == 3 || i == encode_count - 1)
            fprintf(fout, "\n");
        else
            fprintf(fout, " ");
    }
    fprintf(fout, "};\n\n");

    /* 4-byte ranges table (sorted by pointer, which they already are in the file) */
    fprintf(fout, "#define GB18030_RANGES_SIZE %d\n\n", range_count);
    fprintf(fout, "typedef struct {\n");
    fprintf(fout, "    unsigned int pointer;\n");
    fprintf(fout, "    unsigned int codepoint;\n");
    fprintf(fout, "} GB18030RangeEntry;\n\n");
    fprintf(fout, "static const GB18030RangeEntry gb18030_ranges_table[GB18030_RANGES_SIZE] = {\n");

    for (i = 0; i < range_count; i++) {
        if (i % 4 == 0)
            fprintf(fout, "    ");
        fprintf(fout, "{%6d, 0x%05X},", range_entries[i].pointer, range_entries[i].codepoint);
        if (i % 4 == 3 || i == range_count - 1)
            fprintf(fout, "\n");
        else
            fprintf(fout, " ");
    }
    fprintf(fout, "};\n");

    fclose(fout);
    free(decode_table);
    free(encode_entries);
    free(range_entries);

    return 0;
}
