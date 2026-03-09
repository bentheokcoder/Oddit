import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessingRequest {
  audio_file_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { audio_file_id }: ProcessingRequest = await req.json();

    const { data: audioFile, error: fetchError } = await supabase
      .from("audio_files")
      .select("*")
      .eq("id", audio_file_id)
      .single();

    if (fetchError || !audioFile) {
      throw new Error("Audio file not found");
    }

    const { data: job, error: jobError } = await supabase
      .from("processing_jobs")
      .select("*")
      .eq("audio_file_id", audio_file_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (jobError || !job) {
      throw new Error("Processing job not found");
    }

    await supabase
      .from("processing_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("podcast-audio")
      .download(audioFile.storage_path);

    if (downloadError || !fileData) {
      throw new Error("Failed to download audio file");
    }

    const inputBytes = new Uint8Array(await fileData.arrayBuffer());
    const inputPath = `/tmp/input-${audio_file_id}.${audioFile.mime_type.split('/')[1]}`;
    const outputPath = `/tmp/output-${audio_file_id}.mp3`;

    await Deno.writeFile(inputPath, inputBytes);

    const ffmpegArgs = [
      "-i", inputPath,
      "-af",
      [
        "silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB:detection=peak",
        "silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-50dB:detection=peak",
        "afade=t=in:st=0:d=0.01",
        "afade=t=out:st=0:d=0.01",
        "highpass=f=80",
        "lowpass=f=15000",
        "equalizer=f=200:width_type=o:width=1:g=-2",
        "equalizer=f=3000:width_type=o:width=2:g=2",
        "equalizer=f=8000:width_type=o:width=2:g=1",
        "deesser",
        "compand=attacks=0.3:decays=0.8:points=-80/-80|-45/-45|-27/-25|-5/-10|0/-7|20/-7:soft-knee=6:gain=5:volume=-90:delay=0.1",
        "acompressor=threshold=0.089:ratio=4:attack=20:release=250",
        "loudnorm=I=-16:TP=-1.5:LRA=11"
      ].join(","),
      "-ar", "44100",
      "-b:a", "192k",
      "-y",
      outputPath
    ];

    const process = new Deno.Command("ffmpeg", {
      args: ffmpegArgs,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stderr } = await process.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      console.error("FFmpeg error:", errorText);
      throw new Error("Audio processing failed");
    }

    const processedBytes = await Deno.readFile(outputPath);
    const processedBlob = new Blob([processedBytes], { type: "audio/mpeg" });

    const outputFileName = `processed/${audio_file_id}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("podcast-audio")
      .upload(outputFileName, processedBlob, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error("Failed to upload processed audio");
    }

    await supabase
      .from("processing_jobs")
      .update({
        status: "completed",
        processed_storage_path: outputFileName,
        processed_file_size: processedBytes.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    await Deno.remove(inputPath).catch(() => {});
    await Deno.remove(outputPath).catch(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        processed_path: outputFileName,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Processing error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
