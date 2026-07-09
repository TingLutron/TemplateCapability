require 'webrick'
port = (ENV['PORT'] || 3457).to_i
server = WEBrick::HTTPServer.new(
  :Port => port,
  :DocumentRoot => File.dirname(__FILE__),
  :Logger => WEBrick::Log.new('/dev/null'),
  :AccessLog => []
)
trap('INT') { server.shutdown }
server.start
