/*
 * EUC-JP table generator
 *
 * Reads the WHATWG index-jis0208.txt and index-jis0212.txt files and generates
 * a C header containing:
 *   1. The JIS0208 decode table (pointer → Unicode)
 *   2. The JIS0208 encode table (Unicode → pointer) for encoding
 *   3. The JIS0212 decode table (pointer → Unicode) - only for decoding
 *
 * Usage: eucjp_gen <input_dir> <output_file>
 *
 * The input_dir should contain index-jis0208.txt and index-jis0212.txt
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Entry for the encode table: maps Unicode code point to pointer */
typedef struct {
    unsigned int codepoint;
    unsigned int pointer;
} EncodeEntry;

/* Comparison function for sorting by codepoint */
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

static int process_index_file(const char *filepath, unsigned int **decode_table,
                              int *table_size, EncodeEntry **encode_entries,
                              int *encode_count, int *max_entries)
{
    FILE *fin;
    char line[512];
    int count = 0;
    int max_pointer = -1;

    /* First pass: find max pointer */
    fin = fopen(filepath, "r");
    if (!fin) {
        fprintf(stderr, "Cannot open %s\n", filepath);
        return -1;
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
        fprintf(stderr, "No entries found in %s\n", filepath);
        return -1;
    }

    *table_size = max_pointer + 1;
    *decode_table = calloc(*table_size, sizeof(unsigned int));
    if (!*decode_table) {
        fprintf(stderr, "Out of memory\n");
        return -1;
    }

    if (encode_entries) {
        *encode_entries = calloc(count, sizeof(EncodeEntry));
        if (!*encode_entries) {
            fprintf(stderr, "Out of memory\n");
            free(*decode_table);
            return -1;
        }
        *max_entries = count;
    }

    /* Second pass: populate tables */
    fin = fopen(filepath, "r");
    if (!fin) {
        fprintf(stderr, "Cannot open %s\n", filepath);
        free(*decode_table);
        if (encode_entries) free(*encode_entries);
        return -1;
    }

    while (fgets(line, sizeof(line), fin)) {
        int pointer;
        unsigned int codepoint;

        if (line[0] == '#' || line[0] == '\n' || line[0] == '\r')
            continue;

        if (sscanf(line, " %d\t0x%X", &pointer, &codepoint) == 2) {
            if (pointer >= 0 && pointer < *table_size) {
                (*decode_table)[pointer] = codepoint;
                if (encode_entries) {
                    (*encode_entries)[*encode_count].codepoint = codepoint;
                    (*encode_entries)[*encode_count].pointer = pointer;
                    (*encode_count)++;
                }
            }
        }
    }
    fclose(fin);

    return count;
}

int main(int argc, char **argv)
{
    FILE *fout;
    char inpath[1024];
    unsigned int *jis0208_decode = NULL;
    unsigned int *jis0212_decode = NULL;
    EncodeEntry *encode_entries = NULL;
    int jis0208_size = 0, jis0212_size = 0;
    int encode_count = 0, max_entries = 0;
    int i, jis0208_count, jis0212_count;

    if (argc != 3) {
        fprintf(stderr, "Usage: %s <input_dir> <output_file>\n", argv[0]);
        return 1;
    }

    /* Process JIS0208 (with encode table) */
    snprintf(inpath, sizeof(inpath), "%s/index-jis0208.txt", argv[1]);
    jis0208_count = process_index_file(inpath, &jis0208_decode, &jis0208_size,
                                        &encode_entries, &encode_count, &max_entries);
    if (jis0208_count < 0) {
        return 1;
    }

    /* Process JIS0212 (decode only) */
    snprintf(inpath, sizeof(inpath), "%s/index-jis0212.txt", argv[1]);
    jis0212_count = process_index_file(inpath, &jis0212_decode, &jis0212_size,
                                        NULL, NULL, NULL);
    if (jis0212_count < 0) {
        free(jis0208_decode);
        free(encode_entries);
        return 1;
    }

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

    fprintf(stderr, "eucjp_gen: JIS0208: %d entries (size %d), JIS0212: %d entries (size %d), %d encode entries\n",
            jis0208_count, jis0208_size, jis0212_count, jis0212_size, encode_count);

    fout = fopen(argv[2], "w");
    if (!fout) {
        fprintf(stderr, "Cannot open %s for writing\n", argv[2]);
        free(jis0208_decode);
        free(jis0212_decode);
        free(encode_entries);
        return 1;
    }

    fprintf(fout, "/* Auto-generated by eucjp_gen. Do not edit. */\n\n");

    /* JIS0208 decode table */
    fprintf(fout, "#define EUCJP_JIS0208_SIZE %d\n\n", jis0208_size);
    fprintf(fout, "static const unsigned int eucjp_jis0208_table[EUCJP_JIS0208_SIZE] = {\n");

    for (i = 0; i < jis0208_size; i++) {
        if (i % 8 == 0)
            fprintf(fout, "    ");
        fprintf(fout, "0x%04X,", jis0208_decode[i]);
        if (i % 8 == 7 || i == jis0208_size - 1)
            fprintf(fout, "\n");
        else
            fprintf(fout, " ");
    }
    fprintf(fout, "};\n\n");

    /* JIS0212 decode table */
    fprintf(fout, "#define EUCJP_JIS0212_SIZE %d\n\n", jis0212_size);
    fprintf(fout, "static const unsigned int eucjp_jis0212_table[EUCJP_JIS0212_SIZE] = {\n");

    for (i = 0; i < jis0212_size; i++) {
        if (i % 8 == 0)
            fprintf(fout, "    ");
        fprintf(fout, "0x%04X,", jis0212_decode[i]);
        if (i % 8 == 7 || i == jis0212_size - 1)
            fprintf(fout, "\n");
        else
            fprintf(fout, " ");
    }
    fprintf(fout, "};\n\n");

    /* Encode table (JIS0208 only, sorted by codepoint for binary search) */
    fprintf(fout, "#define EUCJP_ENCODE_SIZE %d\n\n", encode_count);
    fprintf(fout, "typedef struct {\n");
    fprintf(fout, "    unsigned int codepoint;\n");
    fprintf(fout, "    unsigned int pointer;\n");
    fprintf(fout, "} EUCJPEncodeEntry;\n\n");
    fprintf(fout, "static const EUCJPEncodeEntry eucjp_encode_table[EUCJP_ENCODE_SIZE] = {\n");

    for (i = 0; i < encode_count; i++) {
        if (i % 4 == 0)
            fprintf(fout, "    ");
        fprintf(fout, "{0x%04X, %5d},", encode_entries[i].codepoint, encode_entries[i].pointer);
        if (i % 4 == 3 || i == encode_count - 1)
            fprintf(fout, "\n");
        else
            fprintf(fout, " ");
    }
    fprintf(fout, "};\n");

    fclose(fout);
    free(jis0208_decode);
    free(jis0212_decode);
    free(encode_entries);

    return 0;
}
