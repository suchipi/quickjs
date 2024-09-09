#ifndef DEBUGPRINT_H
#define DEBUGPRINT_H

#ifdef DEBUG
#define debugprint(...); printf (__VA_ARGS__);
#else
#define debugprint(...);
#endif

#endif
