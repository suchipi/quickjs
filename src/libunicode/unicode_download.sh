#!/bin/sh
set -e

URL="ftp://ftp.unicode.org/Public/14.0.0/ucd"

OUTDIR="downloaded"

wget "$URL/CaseFolding.txt" -O "$OUTDIR/CaseFolding.txt"
wget "$URL/DerivedNormalizationProps.txt" -O "$OUTDIR/DerivedNormalizationProps.txt"
wget "$URL/PropList.txt" -O "$OUTDIR/PropList.txt"
wget "$URL/SpecialCasing.txt" -O "$OUTDIR/SpecialCasing.txt"
wget "$URL/CompositionExclusions.txt" -O "$OUTDIR/CompositionExclusions.txt"
wget "$URL/ScriptExtensions.txt" -O "$OUTDIR/ScriptExtensions.txt"
wget "$URL/UnicodeData.txt" -O "$OUTDIR/UnicodeData.txt"
wget "$URL/DerivedCoreProperties.txt" -O "$OUTDIR/DerivedCoreProperties.txt"
wget "$URL/NormalizationTest.txt" -O "$OUTDIR/NormalizationTest.txt"
wget "$URL/Scripts.txt" -O "$OUTDIR/Scripts.txt"
wget "$URL/PropertyValueAliases.txt" -O "$OUTDIR/PropertyValueAliases.txt"

# The url path for this one is subtly different
wget "$URL/emoji/emoji-data.txt" -O "$OUTDIR/emoji-data.txt"
