%w[
  삭제할_브랜치_이름
].each do |name|
  command = "git push origin :#{name}"
  puts command
  system command
end
