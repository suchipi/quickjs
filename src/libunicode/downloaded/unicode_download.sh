#!/bin/sh
set -e

URL="ftp://ftp.unicode.org/Public/15.0.0/ucd"

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
