### Open phisiology viewer data converter wrapper

#### Description

The purpose of this wrapper is to extract the data conversion that happens inside the open-phisiology viewer UI and make this available through a CLI wrapper tool usable from command line.

#### Usage

The tool can be ran from the terminal, below a brief description of all the available options:

- -f / --from
  - it allows the user to specify the format from/step from which the conversion will start.
  - required:**YES**
- -t / --to
  - it allows the user to specify the format from/step to which the conversion will stop.
  - if this option is used the tool will do a clean up of all the unnecessary files.
  - required:**NO**
- -i / --input
  - it allows the user to specify the input string or file to be used for the conversion.
  - required:**YES**
- -o / --output
  - it allows the user to specify the output folder name where the file(s) will be saved.
  - if the folder specified already exists in the filesystem the user will be prompted with the new name made from the string in input plus the timestamp.
  - required:**NO**

###### Notes:

The wrapper has been developed and tested using node v14.16.1+.

During testing has been noticed that node v12*, v13 and v14.1.0 do not work.
