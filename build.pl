#!/usr/bin/perl

use strict;
use warnings;
use File::Basename;
use Term::ANSIColor;
use File::Copy;
use Digest::MD5 qw(md5_hex);
use Getopt::Long;

my $input_directory = 'content/';
my $output_directory = 'docs/';
my $layout_directory = 'layout/';

my $local = 0;
my $root = 'https://morris-frank.dev/';
GetOptions ('local' => \$local);

if ($local) {
    print colored("⇒ Building for local dev", "white"), "\n";
    $root = 'file:///home/morris/src/morris-frank/morris-frank.dev/docs/';
}

build();
exit;

sub build {
    my $css_link = process_sass($layout_directory, $output_directory);
    my $skeleton = process_skeleton($layout_directory, $css_link);
    process_content_files($input_directory, $skeleton, $output_directory, $root);
}

sub process_skeleton {
    my ($layout_dir, $css_path) = @_;
    my $skeleton = read_file($layout_dir . 'skeleton.html');
    $skeleton =~ s/\{\{CSS_FILE\}\}/$css_path/g;
    return $skeleton;
}

sub process_content_files {
    my ($input_dir, $skeleton, $output_dir, $root_path) = @_;
    my @input_list = glob "$input_dir*html";

    foreach my $input_file (@input_list) {
        process_content_file($input_file, $skeleton, $output_dir, $root_path);
    }
    print colored( "⇐ Processed all content", 'green' ), "\n";
}

sub process_content_file {
    my ($input_file, $skeleton, $output_dir, $root_path) = @_;
    my $basename = basename($input_file, ".html");
    print colored( "    Processing $basename", 'yellow' ), "\n";

    my $content = read_file($input_file);
    my $title = "";
    if ($content =~ m/<h2[^>]*>([^<]+)<\/h2>/i ) {
        $title = $1;
    } else {
        $title = $basename;
    }

    my $output = $skeleton;
    $output =~ s/\{\{CONTENT\}\}/$content/g;
    $output =~ s/\{\{TITLE\}\}/$title/g;
    $output =~ s/\{\{ROOT\}\}/$root_path/g;

    my $output_file = "";
    if ($basename eq "index") {
        $output_file = "$output_dir$basename.html";
    } else {
        mkdir($output_dir . $basename);
        $output_file = "$output_dir$basename/index.html";
    }
    write_file($output_file, $output);

    beautify_file($output_file)
}

sub beautify_file {
    # Beautifies an HTML source file
    # :param filename
    my ($filename)  = @_;

    system("node_modules/.bin/js-beautify $filename > $filename.bak");
    move("$filename.bak", $filename);
}

sub process_sass {
    my ($layout_dir, $output_dir) = @_;
    print colored("    Deleting old main.css", 'red'), "\n";
    unlink glob "${output_dir}main-*.css";
    print colored("    Processing ${layout_dir}main.sass", 'yellow' ), "\n";
    system("node_modules/.bin/sass ${layout_dir}main.sass ${output_dir}main.css");

    my $fingerprint = substr(hash_file("${output_dir}main.css"), 0, 10);
    my $save_name = "main-${fingerprint}.css";

    move("${output_dir}main.css", "${output_dir}${save_name}");
    print colored( "⇐ Built ${output_dir}${save_name}", 'green' ), "\n";
    return $save_name;
}

sub hash_file {
    my ($filename) = @_;
    my $hash;
    local $/ = undef;
    open FILE, "$filename";
    binmode FILE;
    my $data = <FILE>;
    close FILE;
    $hash = md5_hex($data);
    return $hash;
}

sub read_file {
    my ($filename) = @_;

    open my $in, '<:encoding(UTF-8)', $filename or die "Could not open '$filename' for reading $!";
    local $/ = undef;
    my $all = <$in>;
    close $in;

    return $all;
}

sub write_file {
    my ($filename, $content) = @_;

    open my $out, '>:encoding(UTF-8)', $filename or die "Could not open '$filename' for writing $!";;
    print $out $content;
    close $out;

    return;
}
