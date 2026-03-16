#!/usr/bin/env python3
"""Simple runner - Convert and show results"""

import sys
from convert_final import main

if __name__ == "__main__":
    try:
        result = main()
        if not result:
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
