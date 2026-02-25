r"""
     /\
    /  \   __  _____  _ __
   / /\ \  \ \/ / _ \| '_ \
  / ____ \  >  < (_) | | | |
 /_/    \_\/_/\_\___/|_| |_|
                       memorilabs.ai
"""


class Config:
    def __init__(self):
        self.llm = Llm()


class Llm:
    def __init__(self):
        self.provider = None
        self.version = None
        self.model = None
