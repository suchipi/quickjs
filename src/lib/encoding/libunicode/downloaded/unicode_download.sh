#!/bin/sh
set -e

VERSION="16.0.0"
EMOJI_VERSION="16.0"
BASE_URL="ftp://ftp.unicode.org/Public"
URL="$BASE_URL/$VERSION/ucd"

wget "$URL/CaseFolding.txt" -O "./CaseFolding.txt"
wget "$URL/DerivedNormalizationProps.txt" -O "./DerivedNormalizationProps.txt"
wget "$URL/PropList.txt" -O "./PropList.txt"
wget "$URL/SpecialCasing.txt" -O "./SpecialCasing.txt"
wget "$URL/CompositionExclusions.txt" -O "./CompositionExclusions.txt"
wget "$URL/ScriptExtensions.txt" -O "./ScriptExtensions.txt"
wget "$URL/UnicodeData.txt" -O "./UnicodeData.txt"
wget "$URL/DerivedCoreProperties.txt" -O "./DerivedCoreProperties.txt"
wget "$URL/NormalizationTest.txt" -O "./NormalizationTest.txt"
wget "$URL/Scripts.txt" -O "./Scripts.txt"
wget "$URL/PropertyValueAliases.txt" -O "./PropertyValueAliases.txt"

# The url path for this one is subtly different
wget "$URL/emoji/emoji-data.txt" -O "./emoji-data.txt"

wget "$BASE_URL/emoji/$EMOJI_VERSION/emoji-sequences.txt" -O "./emoji-sequences.txt"
wget "$BASE_URL/emoji/$EMOJI_VERSION/emoji-zwj-sequences.txt" -O "./emoji-zwj-sequences.txt"
