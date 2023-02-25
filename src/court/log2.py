import math
import sys
import os

st = os.path.getsize(sys.argv[1])
print(int(math.ceil(math.log(st, 2))))